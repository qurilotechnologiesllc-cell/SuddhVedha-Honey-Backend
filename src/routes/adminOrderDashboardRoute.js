const express = require('express');
const router = express.Router();
const { getAllOrders, getOrderfullDetails } = require('../controllers/adminOrderDashboard');
const { authMiddleware } = require('../middlewares/authmiddleware');

router.get('/orders', authMiddleware, getAllOrders);
router.get('/orders/:id', authMiddleware, getOrderfullDetails);
module.exports = router;