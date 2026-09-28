const express = require('express')
const router = express.Router()
const { addSubscripationPlans, AddComboSetsInPlans, getSubscripationPlans, removeComboSets, removeSubscripationPlans } = require('../controllers/plansController')

const { authMiddleware } = require('../middlewares/authmiddleware')

const { uploadSingle } = require('../middlewares/upload.middleware')

router.post('/add', authMiddleware, addSubscripationPlans)

router.post('/add/plan-comboset', authMiddleware, uploadSingle, AddComboSetsInPlans)

router.get( '/all-plans', getSubscripationPlans);

router.delete('/remove/combosets/:planId/:combosetId', removeComboSets)

router.delete( '/remove/:plansId', authMiddleware, removeSubscripationPlans)

module.exports = router