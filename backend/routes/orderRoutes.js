// routes/orderRoutes.js
const router = require('express').Router();
const ctrl   = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/',      ctrl.createOrder);
router.get('/',       ctrl.getMyOrders);
router.get('/:id',    ctrl.getOrder);

module.exports = router;