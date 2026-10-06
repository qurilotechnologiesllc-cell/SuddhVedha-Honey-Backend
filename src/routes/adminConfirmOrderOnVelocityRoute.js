const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authmiddleware')

const { checkdeliveryavailability, checkDeliveryAvailabilitybyAdmin, creareOrderByAdmin, orderTrackingByVelocityWebhooks, cancelOrderByAdmin } = require('../controllers/adminConfirmOrderOnVelocityController')

router.post('/checkdeliveryavailability', checkdeliveryavailability);
router.post('/checkdeliveryavailabilitybyadmin', authMiddleware, checkDeliveryAvailabilitybyAdmin);
router.post('/createorderbyadmin', authMiddleware, creareOrderByAdmin);
router.post('/webhook/velocity/update-tracking-status', orderTrackingByVelocityWebhooks);
router.post('/cancel-order', authMiddleware, cancelOrderByAdmin)

module.exports = router;