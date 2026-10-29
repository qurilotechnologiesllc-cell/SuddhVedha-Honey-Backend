const express = require('express')
const router = express.Router()
const { SubmitDetails, getEmailOnlySubscribers, getDetailedSubscribers, triggerCampaign, resumeCampaign } = require('../controllers/userSubscribeController')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/submit', SubmitDetails)
router.get('/subscribers/email-only', authMiddleware, getEmailOnlySubscribers)
router.get('/subscribers/detailed', authMiddleware, getDetailedSubscribers)
router.post('/subscribers/launch-email', authMiddleware, triggerCampaign);
router.post('/subscribers/launch-email/:id/resume', authMiddleware, resumeCampaign);

module.exports = router