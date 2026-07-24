const express = require('express')
const router = express.Router()
const { uploadSingle } = require('../middlewares/upload.middleware')
const { addHoneyBenefitsByAdmin, getAllBenefits, removeBenefitsByAdmin } = require('../controllers/honeyBenefitsController')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/add', uploadSingle, addHoneyBenefitsByAdmin);
router.get('/all-benefits/:category', getAllBenefits);
router.delete('/remove/:benefitId', removeBenefitsByAdmin);

module.exports = router