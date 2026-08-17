const express = require('express')
const router = express.Router()
const { addSubscripationPlans, getSubscripationPlans, removeSubscripationPlans } = require('../controllers/plansController')

const { authMiddleware } = require('../middlewares/authmiddleware')

const { uploadSingle } = require('../middlewares/upload.middleware')

router.post('/add', authMiddleware, uploadSingle, addSubscripationPlans)

router.get( '/all-plans', getSubscripationPlans);

router.delete( '/remove/:plansId', authMiddleware, removeSubscripationPlans)

module.exports = router