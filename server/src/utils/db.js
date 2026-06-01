import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedData } from '../data/seedData.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

export async function ensureDb() {
  try { await fs.access(DB_PATH); } catch { await writeDb(seedData); }
}
export async function readDb() { await ensureDb(); return JSON.parse(await fs.readFile(DB_PATH, 'utf8')); }
export async function writeDb(data) { await fs.mkdir(path.dirname(DB_PATH), { recursive: true }); await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2)); }
export async function resetDb() { await writeDb(seedData); return seedData; }
export async function logAudit(user, action, entity, details = {}) {
  const db = await readDb();
  db.auditLogs.unshift({ id: `LOG-${Date.now()}`, at: new Date().toISOString(), user: user?.email || 'system', role: user?.role || 'system', action, entity, details });
  await writeDb(db);
}
