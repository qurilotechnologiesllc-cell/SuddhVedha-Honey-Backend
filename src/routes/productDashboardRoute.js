const express = require('express');
const router = express.Router();

const { getTotalProductCount, getProductsByType, getLowStockProductlist } = require('../controllers/productDashboardController')

const { authMiddleware } = require('../middlewares/authmiddleware')

router.get('/total-product', authMiddleware, getTotalProductCount);

router.get('/filter', authMiddleware, getProductsByType);

router.get('/low-stock', authMiddleware, getLowStockProductlist)

module.exports = router