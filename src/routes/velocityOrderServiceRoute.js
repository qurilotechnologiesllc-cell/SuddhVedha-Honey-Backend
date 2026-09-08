const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authmiddleware')

const { checkdeliveryavailability, checkDeliveryAvailabilitybyAdmin, creareOrderByAdmin } = require('../controllers/velocityOrderServiceController')

router.post('/checkdeliveryavailability', authMiddleware, checkdeliveryavailability);
router.post('/checkdeliveryavailabilitybyadmin', authMiddleware, checkDeliveryAvailabilitybyAdmin);
router.post('/createorderbyadmin', authMiddleware, creareOrderByAdmin);
module.exports = router;