const express = require('express')
const router = express.Router()

const { submituserEnquiry } = require('../controllers/userEnquiryController')

router.post('/submit', submituserEnquiry)

module.exports = router