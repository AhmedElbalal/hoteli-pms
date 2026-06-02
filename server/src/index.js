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
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : true,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'HOTELI', version: '1.0.0' }));
app.use('/api', api);
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => console.log(`HOTELI API running on http://0.0.0.0:${PORT}`));
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use.`);
  throw err;
});
export { app };
