const express = require('express')
const router = express.Router()
const { applyCoupon } = require('../controllers/couponController')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/apply', authMiddleware, applyCoupon)

module.exports = router