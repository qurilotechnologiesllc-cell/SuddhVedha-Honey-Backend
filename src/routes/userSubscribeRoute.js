const express = require('express')
const router = express.Router()
const { SubmitDetails, getAllSubscribeUser } = require('../controllers/userSubscribeController')

router.post('/submit', SubmitDetails)
router.get('/subscribers', getAllSubscribeUser)

module.exports = router