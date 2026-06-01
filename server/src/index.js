import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { api } from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureDb } from './utils/db.js';

const app = express();
const PORT = process.env.PORT || 4100;

await ensureDb();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'HOTELI', version: '1.0.0' }));
app.use('/api', api);
app.use(errorHandler);

const server = app.listen(PORT, () => console.log(`HOTELI API running on http://localhost:${PORT}`));
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use. Set PORT=4101 or close the old Node process.`);
  throw err;
});
export { app };
