const express = require('express');
const router = express.Router();

const { getTotalProductCount, getProductsByType, getLowStockProductlist, getProductStockList, getproductStockHistory } = require('../controllers/productDashboardController')

const { authMiddleware } = require('../middlewares/authmiddleware')

router.get('/total-product', authMiddleware, getTotalProductCount);

router.get('/filter', authMiddleware, getProductsByType);

router.get('/low-stock', authMiddleware, getLowStockProductlist);

router.get('/stock-list', authMiddleware, getProductStockList);

router.get('/stock-history/:productId', authMiddleware, getproductStockHistory);

module.exports = router