import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { schedulesRouter } from './routes/schedules.js';
import { selectionsRouter } from './routes/selections.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../client/dist');

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/schedules', schedulesRouter);
  app.use('/api/selections', selectionsRouter);

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({
      error: err.message || 'Unexpected server error'
    });
  });

  return app;
}
