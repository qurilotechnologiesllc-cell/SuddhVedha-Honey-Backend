const express = require('express')
const router = express.Router()
const { addOffer, getAllOffers, removeOffer } = require('../controllers/offerController')

router.post('/add', addOffer)
router.get('/all', getAllOffers)
router.delete('/remove/:offerId', removeOffer)

module.exports = router