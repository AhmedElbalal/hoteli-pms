import jwt from 'jsonwebtoken';
import { readDb } from '../utils/db.js';

const configuredSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters in production');
}
const secret = configuredSecret || 'dev-secret';
export function signUser(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, secret, { expiresIn: '8h', algorithm: 'HS256' });
}
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const claims = jwt.verify(token, secret, { algorithms: ['HS256'] });
    const db = await readDb();
    const user = db.users.find(u => u.id === claims.id);
    if (!user || user.email !== claims.email || !user.role || user.disabled === true || user.active === false) {
      return res.status(401).json({ error: 'Account is no longer authorized' });
    }
    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(err);
  }
}
export function allowRoles(...roles) {
  return (req, res, next) => roles.includes(req.user.role) || req.user.role === 'ADMIN' ? next() : res.status(403).json({ error: 'Permission denied' });
}
