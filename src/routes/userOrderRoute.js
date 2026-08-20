const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')
const { createOrderByUser, getMyordersDetails, razorpayWebhooks } = require('../controllers/orderController')

router.post('/create', authMiddleware, createOrderByUser);

router.get('/my-orders', authMiddleware, getMyordersDetails);

router.post('/payments/webhooks', razorpayWebhooks)

module.exports = router