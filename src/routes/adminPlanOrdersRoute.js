const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authmiddleware')

const { getAllpurchasePlansbyUser, createPlanDeliveryOrderOnVelocity, getPlansCombosets } = require('../controllers/adminPlanOrderController');

router.get('/purchase-plans', authMiddleware, getAllpurchasePlansbyUser);
router.post('/create-plan-delivery-order', authMiddleware, createPlanDeliveryOrderOnVelocity);
router.get('/combosets/:planId', authMiddleware, getPlansCombosets);

module.exports = router;