const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')
const { createOrderByUser, getMyordersDetails } = require('../controllers/orderController')

router.post('/create', authMiddleware, createOrderByUser);

router.get('/my-orders', authMiddleware, getMyordersDetails);

module.exports = router