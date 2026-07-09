const express = require('express')
const router = express.Router()
const { uploadVideo } = require('../middlewares/upload.middleware')

const { uploadProductVideo, getAllProductsVideo, removeProductVideo } = require('../controllers/videoController')

router.post('/upload/:productId', uploadVideo, uploadProductVideo);
router.get('/:productId', getAllProductsVideo);
router.delete('/:videoId', removeProductVideo)

module.exports = router