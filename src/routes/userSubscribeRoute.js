const express = require('express')
const router = express.Router()
const { SubmitDetails, getAllSubscribeUser } = require('../controllers/userSubscribeController')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/submit', SubmitDetails)
router.get('/subscribers', authMiddleware, getAllSubscribeUser)

module.exports = router