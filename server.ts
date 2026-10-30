import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { generateCoachAdvice } from './src/server/geminiService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Server-side Gemini API endpoint
  app.post('/api/gemini/coach', async (req, res) => {
    try {
      const result = await generateCoachAdvice(req.body || {});
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(result);
    } catch (error) {
      console.error('Server Gemini route error:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MyFit Journey full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
