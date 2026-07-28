const express = require('express')
const router = express.Router()
const { SignInAdmin, verifyAdminOtp, updateAdminprofile, GetAdminProfile, logoutAdmin } = require('../controllers/adminAuthController')
const { uploadSingle } = require('../middlewares/upload.middleware')
const { authMiddleware } = require('../middlewares/authmiddleware')

router.post('/signin', SignInAdmin);
router.post('/verify-otp', verifyAdminOtp);
router.put('/update/admin-profile', authMiddleware, uploadSingle, updateAdminprofile);
router.get('/profile', authMiddleware, GetAdminProfile);
router.post('/logout', authMiddleware, logoutAdmin)

module.exports = router