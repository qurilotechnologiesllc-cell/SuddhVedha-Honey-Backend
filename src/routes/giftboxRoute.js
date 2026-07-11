const express = require('express')
const router = express.Router()
const { uploadSingle } = require('../middlewares/upload.middleware')
const { addGiftBox, getAllGiftBoxes, removeGiftBox } = require('../controllers/giftboxController')

router.post('/gift-box', uploadSingle, addGiftBox)
router.get('/gift-box', getAllGiftBoxes)
router.delete('/remove/gift-box/:giftBoxId', removeGiftBox)

module.exports = router