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

function getAIClient() {
  const rawKey = process.env.GEMINI_API_KEY;
  const apiKey = rawKey ? rawKey.trim().replace(/^['"]|['"]$/g, '') : '';
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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

    const ai = getAIClient();
    if (!ai) {
      return res.status(400).json({
        error: 'Gemini API key is not configured. Please set your API key in the Settings > Secrets panel.',
      });
    }

    try {
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

      const chat = ai.chats.create({
        model: 'gemini-4-hydrogen',
        history: formattedHistory,
        config: {
          systemInstruction: SYSTEM_PROMPT,
        },
      });

      const response = await Promise.race([
        chat.sendMessage({ message: message.trim() }),
        new Promise((_, reject) =>
          setTimeout(() => reject(Object.assign(new Error('Request timed out waiting for AI model.'), { status: 504 })), 45000)
        ),
      ]);
      return res.json({ text: response?.text ?? '' });
    } catch (error) {
      const upstreamStatus = typeof error?.status === 'number' ? error.status : 500;
      const rawMessage = error?.message || 'Failed to generate response from Gemini API.';

      // Note: Never return 403, 502, 503, or 504 directly because the preview nginx proxy
      // intercepts those status codes and replaces the JSON body with an HTML page.
      if (rawMessage.toLowerCase().includes('leaked')) {
        console.warn('Gemini API key rejected (leaked).');
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
        console.warn('Gemini API key invalid or unauthorized.');
        return res.status(400).json({
          error: 'The configured Gemini API key is not valid. Please check or update GEMINI_API_KEY in the Settings > Secrets panel.',
        });
      }

      if (upstreamStatus === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
        console.warn('Gemini API quota exceeded.');
        return res.status(429).json({
          error: 'API quota exceeded. Please check your plan or select a billing-enabled API key in the Settings > Secrets panel.',
        });
      }

      if (upstreamStatus === 503 || rawMessage.includes('UNAVAILABLE') || rawMessage.includes('high demand')) {
        console.warn('Gemini API temporarily unavailable (503).');
        return res.status(500).json({
          error: 'The AI model is currently experiencing high demand. Please try sending your message again in a moment.',
        });
      }

      console.error('Gemini API Error:', error);
      const safeStatus = upstreamStatus >= 400 && upstreamStatus < 500 && upstreamStatus !== 403 ? upstreamStatus : 500;
      return res.status(safeStatus).json({
        error: rawMessage,
      });
    }
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
