// routes/userRoutes.js
const router   = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect);
router.get('/profile',    ctrl.getProfile);
router.put('/profile',    ctrl.updateProfile);
router.put('/password',
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
  ctrl.changePassword
);

module.exports = router;