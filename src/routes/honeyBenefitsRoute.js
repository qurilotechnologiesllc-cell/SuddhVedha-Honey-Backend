const express = require('express')
const router = express.Router()
const { uploadVideo } = require('../middlewares/upload.middleware')
const { addHoneyBenefitsByAdmin, getAllBenefits, removeBenefitsByAdmin } = require('../controllers/honeyBenefitsController')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/add', uploadVideo, addHoneyBenefitsByAdmin);
router.get('/all-benefits/:category', getAllBenefits);
router.delete('/remove/:benefitId', removeBenefitsByAdmin);

module.exports = router