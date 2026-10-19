const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')
const { uploadReturnEvidence } = require('../middlewares/upload.middleware')
const { createOrderByUser, getMyordersDetails, getOrderDetailsByOrderId, razorpayWebhooks, cancelSingleOrderByUser, getliveTrackingDetails, createReturnRequest, } = require('../controllers/userOrderController')

router.post('/create', authMiddleware, createOrderByUser);

router.get('/my-orders', authMiddleware, getMyordersDetails);

router.get('/details/:orderId', authMiddleware, getOrderDetailsByOrderId);

router.post('/payments/webhooks', razorpayWebhooks);

router.post('/cancel-order/:orderId', authMiddleware, cancelSingleOrderByUser);

router.get('/live-tracking-details/:ordergroupId', authMiddleware, getliveTrackingDetails);

router.post('/return-request-details/:orderId', authMiddleware, uploadReturnEvidence, createReturnRequest);

module.exports = router