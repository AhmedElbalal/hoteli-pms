export function errorHandler(err, _req, res, _next) {
  console.error(err);
  if (err?.name === 'ZodError') {
    const first = err.issues?.[0];
    return res.status(400).json({ error: first?.message || 'Invalid request data', validation: err.flatten?.() });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}
