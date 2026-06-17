// routes/adminRoutes.js
const router = require('express').Router();
const ctrl   = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly); // all admin routes locked down
router.get('/dashboard',              ctrl.getDashboard);
router.get('/orders',                 ctrl.getAllOrders);
router.patch('/orders/:id/status',    ctrl.updateOrderStatus);
router.get('/users',                  ctrl.getAllUsers);

module.exports = router;