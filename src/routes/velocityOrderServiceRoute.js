const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authmiddleware')

const { checkdeliveryavailability } = require('../controllers/velocityOrderServiceController')

router.post('/checkdeliveryavailability', authMiddleware, checkdeliveryavailability);

module.exports = router;