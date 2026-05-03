/**
 * vite.config.js - Vite Configuration & Local Backend API
 * 
 * Configures the Vite development server. It also injects a custom plugin
 * `historyBackendPlugin` which acts as a lightweight local backend to bypass
 * browser localStorage restrictions. It reads/writes to `chat_history.json`.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

/**
 * historyBackendPlugin
 * Intercepts HTTP requests to /api/history and handles File System operations
 * to save the chat history locally.
 */
function historyBackendPlugin() {
  return {
    name: 'history-backend',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Handle GET request for history
        if (req.url === '/api/history' && req.method === 'GET') {
          const filePath = path.resolve('chat_history.json');
          try {
            if (fs.existsSync(filePath)) {
              const data = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify([]));
            }
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to read history' }));
          }
          return;
        }

        // Handle POST request for history
        if (req.url === '/api/history' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const filePath = path.resolve('chat_history.json');
              fs.writeFileSync(filePath, body, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to save history' }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), historyBackendPlugin()],
})
