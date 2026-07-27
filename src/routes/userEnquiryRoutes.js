const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')

const { submituserEnquiry, getUserAllEnquiry, seenUserEnquiry } = require('../controllers/userEnquiryController')

router.post('/submit', submituserEnquiry)

router.get('/all-enquiry', authMiddleware, getUserAllEnquiry)

router.put('/seen-enquiry/:enquiryId', authMiddleware, seenUserEnquiry)

module.exports = router