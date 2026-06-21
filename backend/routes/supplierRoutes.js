// routes/supplierRoutes.js
const router = require('express').Router();
const ctrl   = require('../controllers/supplierController');
const { protect, supplierOnly, supplierApprovedOnly } = require('../middleware/auth');

router.use(protect, supplierOnly); // base gate: must be a supplier account at all

// Profile endpoints work even while pending, so a supplier can see their
// own status / edit business details before approval.
router.get('/me', ctrl.getMyProfile);
router.put('/me', ctrl.updateMyProfile);

// Everything else requires admin approval first.
router.use(supplierApprovedOnly);

router.get('/dashboard',     ctrl.getDashboard);
router.get('/intelligence',  ctrl.getMyIntelligence);

router.get('/products',      ctrl.getMyProducts);
router.post('/products',     ctrl.createProduct);
router.put('/products/:id',  ctrl.updateProduct);
router.delete('/products/:id', ctrl.deleteProduct);

router.get('/orders',        ctrl.getMyOrders);

router.get('/restock-alerts', ctrl.getRestockAlerts);

router.post('/bulk-import',  ctrl.requestBulkImport);
router.get('/bulk-import',   ctrl.getBulkImportJobs);

module.exports = router;
