const { v4: uuidv4 } = require('uuid');
const Admin = require('../models/admin.model');
const { asyncHandler, BadRequestError, UnauthorizedError, NotFoundError, ConflictError, ServiceUnavailableError } = require('../errors/errorConfig');
const redis = require('../utils/redis')
const { sendEmailforOtp } = require('../utils/sendEmail')
const { generateToken } = require('../middlewares/authmiddleware')
const { uploadToCloudinary } = require('../utils/uploadToCloudinary')

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 4-digit OTP
};

const SignInAdmin = asyncHandler(async (req, res) => {
    const { email } = req.body

    // ─── Validation ──────────────────────────────
    if (!email) {
        throw new BadRequestError('Email is required')
    }

    // ─── Email Format Check ───────────────────────
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
        throw new BadRequestError('Invalid email address')
    }

    // ─── Admin Exist Karta Hai? ───────────────────
    const admin = await Admin.findOne({
        email: email.toLowerCase().trim(),
        isActive: true
    })
    if (!admin) {
        throw new NotFoundError(
            'No admin account found with this email'
        )
    }

    // ─── OTP + VerificationId Generate ───────────
    const otp = generateOtp()
    const verificationId = uuidv4()

    // ─── Redis mein Save karo ─────────────────────
    await redis.set(
        `tempAdmin:${verificationId}`,
        JSON.stringify({
            email: admin.email,
            adminId: admin._id,
            otp
        }),
        'EX',
        300  // 5 min
    )

    // ─── Email pe OTP Bhejo ───────────────────────
    const emailResult = await sendEmailforOtp(
        admin.email,
        admin.fullname,
        otp
    )

    if (!emailResult.success) {
        // Redis se delete karo agar email fail
        await redis.del(`tempAdmin:${verificationId}`)
        throw new ServiceUnavailableError(
            'Failed to send OTP email. Please try again'
        )
    }

    res.status(200).json({
        success: true,
        message: `OTP has been sent to your registered email`,
        data: {
            verificationId  // ← Frontend save karega
        }
    })
})


const verifyAdminOtp = asyncHandler(async (req, res) => {
    const { verificationId, otp } = req.body

    // ─── Validation ──────────────────────────────
    if (!verificationId || !otp) {
        throw new BadRequestError(
            'verificationId and otp are required'
        )
    }

    // ─── Redis se Data Fetch ──────────────────────
    const cachedData = await redis.get(`tempAdmin:${verificationId}`)

    if (!cachedData) {
        throw new BadRequestError(
            'OTP expired or invalid. Please login again'
        )
    }


    // ─── Parse karo ───────────────────────────────
    const { email, adminId, otp: cachedOtp } = JSON.parse(cachedData)


    // ─── OTP Match karo ───────────────────────────
    if (cachedOtp !== otp) {
        throw new BadRequestError('Invalid OTP')
    }

    // ─── Admin Fetch karo ─────────────────────────
    const admin = await Admin.findById(adminId)
    if (!admin) {
        throw new NotFoundError('Admin not found')
    }

    // ─── Token Generate karo ──────────────────────
    const token = generateToken({
        id: admin._id,
        email: admin.email,
        username: admin.username,
        role: admin.role
    })

    // ─── Redis se Delete karo ─────────────────────
    await redis.del(`tempAdmin:${verificationId}`)

    // ─── Cookie mein Save karo ────────────────────
    res.cookie('token', token, {
        httpOnly: true,
        signed: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000  // 7 din
    })

    res.status(200).json({
        success: true,
        message: 'Admin login successful',
        data: {
            token
        }
    })
})


const updateAdminprofile = asyncHandler(async (req, res) => {

    const adminId = req.user.id;

    const {
        username,
        email,
        fullname,
        phone,
        role
    } = req.body;

    const admin = await Admin.findById(adminId);

    if (!admin) {
        throw new NotFoundError("Admin not found.");
    }

    // -----------------------------
    // Username Validation
    // -----------------------------

    if (username && username !== admin.username) {

        const existingUsername = await Admin.findOne({
            username
        });

        if (existingUsername) {
            throw new ConflictError("Username already exists.");
        }

        admin.username = username;
    }

    // -----------------------------
    // Phone Validation
    // -----------------------------

    if (phone && phone !== admin.phone) {

        const existingPhone = await Admin.findOne({
            phone
        });

        if (existingPhone) {
            throw new ConflictError("Phone number already exists.");
        }

        admin.phone = phone;
    }

    // -----------------------------
    // Other Fields
    // -----------------------------

    if (fullname) admin.fullname = fullname;

    if (email) admin.email = email;

    if (role) admin.role = role;

    // -----------------------------
    // Profile Image Upload
    // -----------------------------

    if (req.file) {

        // Delete old image
        if (admin.public_id) {

            await cloudinary.uploader.destroy(admin.public_id);

        }

        const uploadedImage = await uploadToCloudinary(
            req.file.buffer,
            "sudhvedahoney/admin"
        );

        admin.profile_img = uploadedImage.secure_url;
        admin.public_id = uploadedImage.public_id;
    }

    await admin.save();

    res.status(200).json({

        success: true,

        message: "Admin profile updated successfully.",

        data: admin

    });

});


module.exports = { SignInAdmin, verifyAdminOtp, updateAdminprofile }

