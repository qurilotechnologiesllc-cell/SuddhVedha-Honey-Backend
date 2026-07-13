const express = require('express')
const router = express.Router()
const { addOffer, getAllOffers, removeOffer, applyCoupon } = require('../controllers/offerController')

router.post('/add', addOffer)
router.get('/all', getAllOffers)
router.delete('/remove/:offerId', removeOffer)
router.post('/apply', applyCoupon)

module.exports = router