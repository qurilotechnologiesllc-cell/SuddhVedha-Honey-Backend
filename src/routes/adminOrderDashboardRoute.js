const express = require('express');
const router = express.Router();
const { getAllOrders, getOrderfullDetails, getOrderWithStatus, getLowStockproductDetails, getOrderWeeklyOverview, reacentOrders, getreturnRequestDetails, adminApprovedOrRejectReturnRequest } = require('../controllers/adminOrderDashboard');
const { authMiddleware } = require('../middlewares/authmiddleware');

router.get('/orders', authMiddleware, getAllOrders);
router.get('/orders/:id', authMiddleware, getOrderfullDetails);
router.get('/orders-with-status', authMiddleware, getOrderWithStatus);
router.get('/low-stock/product', authMiddleware, getLowStockproductDetails);
router.get('/order-per-week', authMiddleware, getOrderWeeklyOverview);
router.get('/recent-orders', authMiddleware, reacentOrders);
router.get('/all-return-orders/details', authMiddleware, getreturnRequestDetails);
router.post('/update/return-request', authMiddleware, adminApprovedOrRejectReturnRequest);
module.exports = router;