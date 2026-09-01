const express = require('express')
const router = express.Router()
const { authMiddleware } = require("../middlewares/authmiddleware")
const { checkoutPlan, razorpayWebhooks, getmyPlanPurchases } = require('../controllers/checkoutPlanController')

router.post('/checkout', authMiddleware, checkoutPlan);
router.post('/payments/webhooks', razorpayWebhooks);
router.get('/my-purchases', authMiddleware, getmyPlanPurchases);
module.exports = router

