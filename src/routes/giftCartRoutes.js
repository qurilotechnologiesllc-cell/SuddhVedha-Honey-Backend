const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')
const { addToGiftCart } = require('../controllers/giftCartController')

router.post('/add', authMiddleware, addToGiftCart)

module.exports = router