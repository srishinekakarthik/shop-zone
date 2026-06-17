// routes/authRoutes.js
// Register & Login are handled client-side by Supabase Auth SDK.
// This router only exposes server-side profile endpoints.
const router          = require('express').Router();
const ctrl            = require('../controllers/authController');
const { protect }     = require('../middleware/auth');

// Get current user profile (requires valid Supabase session token)
router.get('/me', protect, ctrl.getMe);

// Sync OAuth metadata (name, avatar) after OAuth signup
router.post('/sync-profile', protect, ctrl.syncProfile);

module.exports = router;