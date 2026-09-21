const express = require('express');
const router = express.Router();
const { getAllOrders, getOrderfullDetails, getOrderWithStatus, getLowStockproductDetails } = require('../controllers/adminOrderDashboard');
const { authMiddleware } = require('../middlewares/authmiddleware');

router.get('/orders', authMiddleware, getAllOrders);
router.get('/orders/:id', authMiddleware, getOrderfullDetails);
router.get('/orders-with-status', authMiddleware, getOrderWithStatus);
router.get('/low-stock/product', authMiddleware, getLowStockproductDetails);
module.exports = router;