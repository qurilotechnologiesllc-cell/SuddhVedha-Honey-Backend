const express = require('express')
const router = express.Router()
const { sendEnquiry, getAllBulkOrderEnquiry, updateEnquiryStatusWithNotes } = require('../controllers/bulkOrderEnquiryController')
const { authMiddleware } = require('../middlewares/authmiddleware')


router.post('/send', sendEnquiry);
router.get('/all-enquiry', authMiddleware, getAllBulkOrderEnquiry);
router.put('/update-enquiry/:enquiryId', authMiddleware, updateEnquiryStatusWithNotes);

module.exports = router