import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { prismaCoreRouter } from './routes/prismaCore.js';
import { prismaFinanceRouter } from './routes/prismaFinance.js';
import { api } from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureDb } from './utils/db.js';

const app = express();
const PORT = process.env.PORT || 4100;

// Keep the legacy JSON store available during the staged Prisma migration.
// Once every route has moved to PostgreSQL, ensureDb() and the legacy router can be removed.
await ensureDb();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  app: 'HOTELI',
  version: '1.1.0',
  database: process.env.DATABASE_URL ? 'postgresql' : 'legacy-json'
}));

// Prisma-backed routes take precedence when DATABASE_URL is configured.
app.use('/api', prismaCoreRouter);
app.use('/api', prismaFinanceRouter);

// Remaining endpoints continue to use the legacy implementation during migration.
app.use('/api', api);
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => console.log(`HOTELI API running on http://0.0.0.0:${PORT}`));
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use.`);
  throw err;
});

export { app };
