const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middlewares/authmiddleware')
const { getAllNotification, seenNotification, removeNotification } = require('../controllers/notificationController')

router.get('/all', authMiddleware, getAllNotification)
router.patch('/seen/:id', authMiddleware, seenNotification)
router.delete('/remove/:id', authMiddleware, removeNotification)

module.exports = router