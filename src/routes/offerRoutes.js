const express = require('express')
const router = express.Router()
const { addOffer, getAllOffers, removeOffer } = require('../controllers/offerController')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/add', addOffer)
router.get('/all', authMiddleware, getAllOffers)
router.delete('/remove/:offerId', removeOffer)

module.exports = router