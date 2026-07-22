const express = require('express')
const router = express.Router()
const { uploadSingle } = require('../middlewares/upload.middleware')

const { uploadUpcomingProducts, getBanner, removeUpcomingBanners } = require('../controllers/upcomingProductController')

router.post('/add', uploadSingle, uploadUpcomingProducts)
router.get('/all-banners', getBanner)
router.delete('/remove/:bannerId', removeUpcomingBanners)

module.exports = router