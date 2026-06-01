import jwt from 'jsonwebtoken';
const secret = process.env.JWT_SECRET || 'dev-secret';
export function signUser(user) { return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, secret, { expiresIn: '8h' }); }
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = jwt.verify(token, secret); next(); } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}
export function allowRoles(...roles) { return (req, res, next) => roles.includes(req.user.role) || req.user.role === 'ADMIN' ? next() : res.status(403).json({ error: 'Permission denied' }); }
