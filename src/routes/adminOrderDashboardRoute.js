const express = require('express');
const router = express.Router();
const { getAllOrders, getOrderById } = require('../controllers/adminOrderDashboard');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/orders', authMiddleware, getAllOrders);
router.get('/orders/:id', authMiddleware, getOrderById);
module.exports = router;