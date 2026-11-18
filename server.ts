import express from 'express';
import fs from 'fs';
import path from 'path';
import { generateChatReply } from './lib/cyberguard.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const HISTORY_FILE = path.resolve('chat_history.json');

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

    const result = await generateChatReply(message, history);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ text: result.text });
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
