// routes/cartRoutes.js
const router = require('express').Router();
const ctrl   = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

router.use(protect); // all cart routes require auth
router.get('/',          ctrl.getCart);
router.post('/',         ctrl.addToCart);
router.put('/:id',       ctrl.updateCartItem);
router.delete('/',       ctrl.clearCart);
router.delete('/:id',    ctrl.removeFromCart);

module.exports = router;