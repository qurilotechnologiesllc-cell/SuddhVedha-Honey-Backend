const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authmiddleware')

const { getAllpurchasePlansbyUser, createPlanDeliveryOrderOnVelocity, getproductDetails } = require('../controllers/adminPlanOrderController');

router.get('/purchase-plans', authMiddleware, getAllpurchasePlansbyUser);
router.post('/create-plan-delivery-order', authMiddleware, createPlanDeliveryOrderOnVelocity);
router.get('/product-details', authMiddleware, getproductDetails)

module.exports = router;