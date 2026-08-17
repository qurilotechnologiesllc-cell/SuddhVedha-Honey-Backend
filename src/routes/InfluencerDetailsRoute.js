const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')
const { submitInfluencerDetails, getAllInfluencerDetails, removeInfluencerDetails, seenDetails } = require('../controllers/InfluencerDetailsController')

router.post('/submit', submitInfluencerDetails);

router.get('/all-details', authMiddleware, getAllInfluencerDetails);

router.delete('/remove/:id', authMiddleware, removeInfluencerDetails);

router.patch(
    '/:id/seen',
    authMiddleware,
    seenDetails
)

module.exports = router