const { v4: uuidv4 } = require('uuid');
const User = require('../models/user.model');
const { asyncHandler, ConflictError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, } = require('../errors/errorConfig');
const sendOtp = require('../utils/sendOtp');
const redis = require('../utils/redis');
const { generateToken } = require('../middlewares/authmiddleware');
const bcrypt = require('bcrypt')

const generateOtp = () => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // Generates a 4-digit OTP
};

const createUser = asyncHandler(async (req, res) => {
    const { name, mobile } = req.body;

    const mobileRegex = /^[6-9][0-9]{9}$/
    if (!mobileRegex.test(mobile)) {
        throw new BadRequestError(
            'Invalid mobile number. Must be 10 digits starting with 6-9'
        )
    }

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

    console.log(otp);

    // OTP bhejo
    // await sendOtp(mobile, otp);

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

const updateUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { email, gender, DOB, password } = req.body

    // ─── User Dhundo ──────────────────────────────
    const user = await User.findById(userId)
    if (!user) {
        throw new NotFoundError('User not found')
    }

    // ─── Kuch Update Karne Ko Hai? ───────────────
    if (!email && !gender && !DOB && !password) {
        throw new BadRequestError(
            'At least one field required: email, gender, DOB or password'
        )
    }

    // ─── Email Validation ─────────────────────────
    if (email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailRegex.test(email)) {
            throw new BadRequestError('Invalid email address')
        }
        if (email.length > 80) {
            throw new BadRequestError('Email cannot exceed 80 characters')
        }

        // Duplicate email check
        const emailExists = await User.findOne({
            email: email.toLowerCase().trim(),
            _id: { $ne: userId }  // Apne aap ko exclude karo
        })
        if (emailExists) {
            throw new ConflictError('Email already in use by another user')
        }

        user.email = email.toLowerCase().trim()
    }

    // ─── Gender Validation ────────────────────────
    if (gender) {
        const allowedGenders = ['male', 'female', 'other']
        if (!allowedGenders.includes(gender.toLowerCase())) {
            throw new BadRequestError(
                'Gender must be male, female or other'
            )
        }
        user.gender = gender.toLowerCase()
    }

    // ─── DOB Validation ───────────────────────────
    if (DOB) {
        const dobRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/
        if (!dobRegex.test(DOB)) {
            throw new BadRequestError(
                'Invalid DOB format. Use DD/MM/YYYY e.g. 15/08/1995'
            )
        }
        user.DOB = DOB
    }

    // ─── Password Hash ────────────────────────────
    if (password) {
        if (password.length < 6) {
            throw new BadRequestError(
                'Password must be at least 6 characters'
            )
        }
        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(password, salt)
    }

    // ─── Save karo ───────────────────────────────
    await user.save()

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            _id: user._id,
            name: user.name,
            mobile: user.mobile,
            email: user.email || null,
            gender: user.gender || null,
            DOB: user.DOB || null,
            role: user.role
        }
    })
})


module.exports = { createUser, verifyOtp, loginUser, verifyLoginOtp, updateUserProfile };