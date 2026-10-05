const express = require('express')
const router = express.Router()
const { SubmitDetails, getEmailOnlySubscribers, getDetailedSubscribers } = require('../controllers/userSubscribeController')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/submit', SubmitDetails)
router.get('/subscribers/email-only', authMiddleware, getEmailOnlySubscribers)
router.get('/subscribers/detailed', authMiddleware, getDetailedSubscribers)

module.exports = router