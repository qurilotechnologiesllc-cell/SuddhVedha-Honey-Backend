const express = require('express')
const router = express.Router()
const { SignInAdmin, verifyAdminOtp, updateAdminprofile } = require('../controllers/adminAuthController')
const { uploadSingle } = require('../middlewares/upload.middleware')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/signin', SignInAdmin);
router.post('/verify-otp', verifyAdminOtp);
router.put('/update/admin-profile', authMiddleware, uploadSingle, updateAdminprofile)

module.exports = router