const { v4: uuidv4 } = require('uuid');
const User = require('../models/user.model');
const { asyncHandler, ConflictError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, } = require('../errors/errorConfig');
const sendOtp = require('../utils/sendOtp');
const redis = require('../utils/redis');
const { generateToken } = require('../middlewares/authmiddleware');

const generateOtp = () => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // Generates a 4-digit OTP
};

const createUser = asyncHandler(async (req, res) => {
    const { name, mobile } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
        throw new ConflictError('User with this mobile number already exists');
    }

    // Generate OTP
    const otp = generateOtp();
    const verificationId = uuidv4(); // ← Unique ID

    await redis.set(
        `tempuser:${verificationId}`,
        JSON.stringify({ name, mobile, otp }),
        'EX',
        300 // 5 min
    );

    // OTP bhejo
    await sendOtp(mobile, otp);

    res.status(201).json({
        success: true,
        message: 'OTP sent to mobile number. Verify to complete registration.',
        data: {
            verificationId  // ← Frontend isko save karega
        }
    });
});

const verifyOtp = asyncHandler(async (req, res) => {
    const { verificationId, otp } = req.body;

    // Validation
    if (!verificationId || !otp) {
        throw new BadRequestError('Verification ID and OTP are required');
    }

    // Redis se OTP fetch karo
    const cachedData = await redis.get(`tempuser:${verificationId}`);

    // OTP exist karta hai?
    if (!cachedData) {
        throw new BadRequestError('OTP expired or not found. Request new OTP');
    }

    // OTP match karo
    const { name, mobile, otp: cachedOtp } = JSON.parse(cachedData);

    if (cachedOtp !== otp) {
        throw new BadRequestError('Invalid OTP');
    }

    // User create karo
    const newUser = new User({ name, mobile });
    await newUser.save();

    // Redis se OTP aur temp data delete karo
    await redis.del(`tempuser:${verificationId}`);

    const token = generateToken(newUser);

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'Productions',
        sameSite: 'strict',
        signed: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: token
    });
});

const loginUser = asyncHandler(async (req, res) => {
    const { mobile } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ mobile });
    if (!existingUser) {
        throw new NotFoundError('User with this mobile number does not exist');
    }

    // Generate OTP
    const otp = generateOtp();
    const verificationId = uuidv4(); // ← Unique ID

    await redis.set(
        `tempuser:${verificationId}`,
        JSON.stringify({ mobile, otp }),
        'EX',
        300 // 5 min
    );

    // OTP bhejo
    await sendOtp(mobile, otp);

    res.status(200).json({
        success: true,
        message: 'OTP sent to mobile number. Verify to complete login.',
        data: {
            verificationId  // ← Frontend isko save karega
        }
    });
});

const verifyLoginOtp = asyncHandler(async (req, res) => {
    const { verificationId, otp } = req.body;

    // Validation
    if (!verificationId || !otp) {
        throw new BadRequestError('Verification ID and OTP are required');
    }

    // Redis se OTP fetch karo
    const cachedData = await redis.get(`tempuser:${verificationId}`);

    // OTP exist karta hai?
    if (!cachedData) {
        throw new BadRequestError('OTP expired or not found. Request new OTP');
    }

    // OTP match karo
    const { mobile, otp: cachedOtp } = JSON.parse(cachedData);

    if (cachedOtp !== otp) {
        throw new BadRequestError('Invalid OTP');
    }

    // User fetch karo
    const existingUser = await User.findOne({ mobile });
    if (!existingUser) {
        throw new NotFoundError('User with this mobile number does not exist');
    }

    const token = generateToken(existingUser);

    res.cookie("token", token, {
        httpOnly: true,
        secure: false,          // testing ke liye
        sameSite: "strict",
        signed: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Redis se OTP aur temp data delete karo
    await redis.del(`tempuser:${verificationId}`);

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            token
        }
    });
});


module.exports = { createUser, verifyOtp, loginUser, verifyLoginOtp };