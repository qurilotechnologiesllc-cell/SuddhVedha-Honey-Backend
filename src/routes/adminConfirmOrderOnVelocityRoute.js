const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authmiddleware')

const { checkdeliveryavailability, checkDeliveryAvailabilitybyAdmin, creareOrderByAdmin, orderTrackingByVelocityWebhooks } = require('../controllers/adminConfirmOrderOnVelocityController')

router.post('/checkdeliveryavailability', authMiddleware, checkdeliveryavailability);
router.post('/checkdeliveryavailabilitybyadmin', authMiddleware, checkDeliveryAvailabilitybyAdmin);
router.post('/createorderbyadmin', authMiddleware, creareOrderByAdmin);
router.post('/webhook/velocity/update-tracking-status', orderTrackingByVelocityWebhooks);

module.exports = router;