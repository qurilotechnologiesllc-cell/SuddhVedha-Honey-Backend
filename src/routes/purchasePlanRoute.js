const express = require('express')
const router = express.Router()
const { authMiddleware } = require("../middlewares/authmiddleware")
const { checkoutPlan, razorpayWebhooks, getmyPlanPurchases, retryplanPurchasePayment, getUserAddress } = require('../controllers/checkoutPlanController')

router.post('/checkout', authMiddleware, checkoutPlan);
router.post('/payments/webhooks', razorpayWebhooks);
router.get('/my-purchases', authMiddleware, getmyPlanPurchases);
router.post('/retry-plan-payment', authMiddleware, retryplanPurchasePayment);
router.get('/user-address', authMiddleware, getUserAddress);

module.exports = router

