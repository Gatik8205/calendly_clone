/**
 * Centralized error handling middleware.
 * Converts Prisma errors and generic errors into clean JSON responses.
 */
function errorHandler(err, req, res, _next) {
  console.error('[Error]', err.message || err);

  // Prisma known errors
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({ error: 'A record with that value already exists.' });
      case 'P2025':
        return res.status(404).json({ error: 'Record not found.' });
      case 'P2003':
        return res.status(400).json({ error: 'Related record not found.' });
      default:
        break;
    }
  }

  // Validation errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
