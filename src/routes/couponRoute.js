const express = require('express')
const router = express.Router()
const { applyCoupon, getAvailableCoupon, removeCouponByUser } = require('../controllers/couponController')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/apply', authMiddleware, applyCoupon)

router.get('/all-coupons', authMiddleware, getAvailableCoupon)

router.delete('/remove/:offerId', authMiddleware, removeCouponByUser)

module.exports = router