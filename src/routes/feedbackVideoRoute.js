const express = require('express')
const router = express.Router()
const { uploadVideo } = require('../middlewares/upload.middleware')
const { uploadFeedbackVideo, getAllFeedbackVideos, removeFeedbackVideo } = require('../controllers/feedbackVideoController')

router.post('/video/upload', uploadVideo, uploadFeedbackVideo)

router.get('/all-feedback/videos', getAllFeedbackVideos)

router.delete('/remove-feedback/:videoId', removeFeedbackVideo)

module.exports = router