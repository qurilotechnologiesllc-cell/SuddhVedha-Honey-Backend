const express = require('express');
const router = express.Router();
const { uploadPdf } = require('../middlewares/upload.middleware');
const { authMiddleware } = require('../middlewares/authmiddleware');
const { createLabReport, getAllHoneyLabReports } = require('../controllers/honeyLabReportsController');

router.post('/upload', uploadPdf, createLabReport);
router.get('/all', getAllHoneyLabReports);

module.exports = router