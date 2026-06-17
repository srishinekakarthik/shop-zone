// middleware/validate.js – express-validator result checker
const { validationResult } = require('express-validator');

const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err   = new Error('Validation failed');
    err.type    = 'validation';
    err.errors  = errors.array();
    return next(err);
  }
  next();
};

module.exports = validate;