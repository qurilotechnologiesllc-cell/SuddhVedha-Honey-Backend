const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')
const { createOrderByUser, getMyordersDetails, razorpayWebhooks, cancelSingleOrderByUser, getliveTrackingDetails } = require('../controllers/userOrderController')

router.post('/create', authMiddleware, createOrderByUser);

router.get('/my-orders', authMiddleware, getMyordersDetails);

router.post('/payments/webhooks', razorpayWebhooks);

router.post('/cancel-order/:orderId', authMiddleware, cancelSingleOrderByUser);

router.get('/live-tracking-details/:ordergroupId', authMiddleware, getliveTrackingDetails)

module.exports = router