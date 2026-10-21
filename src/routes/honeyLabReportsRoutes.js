const express = require('express');
const router = express.Router();
const { uploadPdf } = require('../middlewares/upload.middleware');
const { authMiddleware } = require('../middlewares/authmiddleware');
const { createLabReport, getAllHoneyLabReports, removeHoneylabReports} = require('../controllers/honeyLabReportsController');

router.post('/upload', uploadPdf, createLabReport);
router.get('/all', getAllHoneyLabReports);
router.delete('/remove/:reportId', removeHoneylabReports);

module.exports = router