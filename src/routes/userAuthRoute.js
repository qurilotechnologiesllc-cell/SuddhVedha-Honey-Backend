const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authmiddleware')
const { createUser, verifyOtp, loginUser, verifyLoginOtp, updateUserProfile, getUserProfile } = require('../controllers/userAuthController');

// Route to create a new user
router.post('/create', createUser);

// Route to verify OTP
router.post('/verify-otp', verifyOtp);

// Routes to login the users
router.post('/login', loginUser);

// Routes to verify the OTP when user are login
router.post('/verify-login-otp', verifyLoginOtp);

router.put('/update/profile', authMiddleware, updateUserProfile)

router.get('/profile-details', authMiddleware, getUserProfile)

module.exports = router;