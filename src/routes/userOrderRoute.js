const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')
const { createOrderByUser, getMyordersDetails, razorpayWebhooks, cancelSingleOrderByUser, } = require('../controllers/userOrderController')

router.post('/create', authMiddleware, createOrderByUser);

router.get('/my-orders', authMiddleware, getMyordersDetails);

router.post('/payments/webhooks', razorpayWebhooks);

router.post('/cancel-order/:orderId', authMiddleware, cancelSingleOrderByUser);

module.exports = router