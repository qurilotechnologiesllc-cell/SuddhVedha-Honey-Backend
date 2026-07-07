const express = require('express');
const router = express.Router();
const { createUser, verifyOtp, loginUser, verifyLoginOtp } = require('../controllers/userAuthController');

// Route to create a new user
router.post('/create', createUser);

// Route to verify OTP
router.post('/verify-otp', verifyOtp);

// Routes to login the users
router.post('/login', loginUser);

// Routes to verify the OTP when user are login
router.post('/verify-login-otp', verifyLoginOtp);

module.exports = router;