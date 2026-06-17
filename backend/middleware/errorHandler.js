// middleware/errorHandler.js – Centralised error handler
// All errors thrown via next(err) land here.

const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err);

  // MySQL duplicate-entry error
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Duplicate entry – resource already exists.' });
  }

  // Express-validator passes an array of errors via err.errors
  if (err.type === 'validation') {
    return res.status(422).json({ message: 'Validation failed', errors: err.errors });
  }

  const status  = err.statusCode || err.status || 500;
  const message = err.message    || 'Internal Server Error';
  res.status(status).json({ message });
};

module.exports = errorHandler;