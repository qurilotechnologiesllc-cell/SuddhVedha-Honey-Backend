const express = require('express')
const router = express.Router()
const { addOffer, getAllOffers, removeOffer, applyCoupon } = require('../controllers/offerController')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/add', addOffer)
router.get('/all', authMiddleware, getAllOffers)
router.delete('/remove/:offerId', removeOffer)
router.post('/apply', applyCoupon)

module.exports = router