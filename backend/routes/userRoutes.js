// routes/userRoutes.js
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// ── Public — no login required ───────────────────────────────────
// The recipient is clicking this from an email and is very likely
// signed out; the signed token in the query string is the
// authorization, not a session. See unsubscribeByToken in
// userController.js for the HMAC check.
router.get('/unsubscribe', ctrl.unsubscribeByToken);

// ── Server-to-server — called by n8n, protected by a shared secret ──
// Same pattern as POST /api/ingest (see routes/ingestRoutes.js):
// a static key in a custom header, not a user session, since the
// caller is the n8n workflow itself, not a logged-in person.
router.get('/unsubscribe-link/:userId', (req, res, next) => {
  if (req.headers['x-ingest-key'] !== process.env.INGEST_SECRET_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}, ctrl.getUnsubscribeLink);

router.use(protect);
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.put('/password',
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
  ctrl.changePassword
);

module.exports = router;