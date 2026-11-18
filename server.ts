import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const HISTORY_FILE = path.resolve('chat_history.json');

const SYSTEM_PROMPT = `You are "CyberGuard AI," a specialized Domain Expert in Indian Cyber Law (IT Act 2000), Global Data Privacy (GDPR/DPDP), and Digital Security Best Practices. Your mission is to provide intermediate to advanced reasoning to assist users in navigating cyber-related social problems such as financial fraud, cyberbullying, and data privacy breaches.

Core Directives:
1. Response Scoping: Strictly limit your expertise to cyber law and digital safety. If a user asks about non-digital topics (e.g., cooking, gardening), politely redirect them to your core domain.
2. Contextual Reasoning: When a user reports an incident, provide a multi-step response:
   - Immediate Triage: Emergency technical actions (e.g., "Freeze your account").
   - Legal Framework: Reference relevant sections (e.g., Section 66D of the IT Act).
   - Reporting Procedure: Guide them to official portals like cybercrime.gov.in.
3. Formatting: Use Markdown headers for readability. Use bolding for critical warnings and code blocks for technical steps.
4. Tone & Persona: Be professional, calm, and empathetic. Avoid legal jargon where a simpler explanation suffices, but remain technically accurate.

Constraints:
- No Hallucinations: If you are unsure about a specific recent amendment, advise the user to consult a human legal professional.
- Privacy: Do not ask for or store the user's personal sensitive data (Aadhaar, passwords, etc.).`;

function getApiKeys() {
  const candidates = [process.env.GEMINI_API_KEY, process.env.VITE_GEMINI_API_KEY]
    .map((k) => (k ? k.trim().replace(/^['"]|['"]$/g, '') : ''))
    .filter(Boolean);
  return [...new Set(candidates)];
}

function createAIClient(apiKey) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

let degradedUntil = new Map();
const COOLDOWN_MS = 5 * 60 * 1000;

async function sendWithModel(ai, model, formattedHistory, userMessage, timeoutMs) {
  const chat = ai.chats.create({
    model,
    history: formattedHistory,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  return Promise.race([
    chat.sendMessage({ message: userMessage }),
    new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error(`Model ${model} timed out.`), { status: 504 })), timeoutMs)
    ),
  ]);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // History API endpoints (preserving chat_history.json persistence)
  app.get('/api/history', async (_req, res) => {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const data = await fs.promises.readFile(HISTORY_FILE, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error('Failed to read history:', error);
      res.status(500).json({ error: 'Failed to read history' });
    }
  });

  app.post('/api/history', async (req, res) => {
    try {
      await fs.promises.writeFile(HISTORY_FILE, JSON.stringify(req.body), 'utf-8');
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to save history:', error);
      res.status(500).json({ error: 'Failed to save history' });
    }
  });

  // Server-side Gemini Chat endpoint
  app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body ?? {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'A non-empty message is required.' });
    }

    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
      return res.status(400).json({
        error: 'Gemini API key is not configured. Please set your API key in the Settings > Secrets panel.',
      });
    }

    const formattedHistory = Array.isArray(history)
      ? history
          .filter((msg) => msg && typeof msg.content === 'string' && msg.content.trim())
          .map((msg) => ({
            role: msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          }))
      : [];

    // Ensure history starts with a user turn if non-empty
    while (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
      formattedHistory.shift();
    }

    let lastError = null;
    const now = Date.now();
    const baseModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
    const activeModels = baseModels.filter((m) => (degradedUntil.get(m) ?? 0) <= now);
    const modelsToTry = activeModels.length > 0 ? activeModels : baseModels;

    for (const apiKey of apiKeys) {
      const ai = createAIClient(apiKey);
      for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i];
        const hasNextModel = i < modelsToTry.length - 1;
        const timeoutMs = hasNextModel ? 8000 : 25000;

        try {
          const response = await sendWithModel(ai, model, formattedHistory, message.trim(), timeoutMs);
          degradedUntil.delete(model);
          return res.json({ text: response?.text ?? '' });
        } catch (error) {
          lastError = error;
          const status = typeof error?.status === 'number' ? error.status : 500;
          const rawMsg = error?.message || '';
          const isAuthError =
            status === 400 ||
            status === 403 ||
            rawMsg.includes('API_KEY_INVALID') ||
            rawMsg.includes('PERMISSION_DENIED') ||
            rawMsg.includes('API key not valid') ||
            rawMsg.toLowerCase().includes('leaked');

          if (isAuthError) {
            break;
          }

          if (status === 503 || status === 504 || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('timed out')) {
            degradedUntil.set(model, Date.now() + COOLDOWN_MS);
          }
        }
      }
    }

    const upstreamStatus = typeof lastError?.status === 'number' ? lastError.status : 500;
    const rawMessage = lastError?.message || 'Failed to generate response from Gemini API.';
    console.error('Gemini API request failed across all models:', rawMessage);

    // Never return 403, 502, 503, or 504 directly because the preview nginx proxy
    // intercepts those status codes and replaces the JSON body with an HTML page.
    if (rawMessage.toLowerCase().includes('leaked')) {
      return res.status(400).json({
        error: 'Your Gemini API key was reported as leaked and is disabled. Please generate a new API key and update GEMINI_API_KEY in the Settings > Secrets panel.',
      });
    }

    if (
      upstreamStatus === 400 ||
      upstreamStatus === 403 ||
      rawMessage.includes('API_KEY_INVALID') ||
      rawMessage.includes('PERMISSION_DENIED') ||
      rawMessage.includes('API key not valid')
    ) {
      return res.status(400).json({
        error: 'The configured Gemini API key is not valid. Please check or update GEMINI_API_KEY in the Settings > Secrets panel.',
      });
    }

    if (upstreamStatus === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({
        error: 'API quota exceeded. Please check your plan or select a billing-enabled API key in the Settings > Secrets panel.',
      });
    }

    if (upstreamStatus === 503 || upstreamStatus === 504 || rawMessage.includes('UNAVAILABLE') || rawMessage.includes('timed out')) {
      return res.status(500).json({
        error: 'The AI model is currently experiencing high demand or slow response times. Please try sending your message again in a moment.',
      });
    }

    const safeStatus = upstreamStatus >= 400 && upstreamStatus < 500 && upstreamStatus !== 403 ? upstreamStatus : 500;
    return res.status(safeStatus).json({
      error: rawMessage,
    });
  });

  app.use('/api', (err, _req, res, _next) => {
    console.error('API Middleware Error:', err);
    res.status(typeof err?.status === 'number' ? err.status : 500).json({
      error: err?.message || 'Internal server error',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve('dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`CyberGuard AI server running at http://${HOST}:${PORT}`);
  });
}

startServer();
