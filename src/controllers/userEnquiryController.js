const Enquiry = require('../models/userEnquiry.model')
const Notification = require('../models/notification.model')
const { sendThankYouEmail } = require('../utils/sendEmail')
const { getIO, ADMIN_ROOM } = require('../utils/socketHandler')
const { asyncHandler, BadRequestError, UnauthorizedError, NotFoundError, ConflictError, ServiceUnavailableError } = require('../errors/errorConfig')

const submituserEnquiry = asyncHandler(async (req, res) => {
    const { name, email, mobile, subject, message } = req.body

    // ─── Validation — Required Fields ───────────
    if (!name || !email || !mobile || !subject || !message) {
        throw new BadRequestError(
            'All fields are required: name, email, mobile, subject, message'
        )
    }

    // ─── Email Validation ────────────────────────
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
        throw new BadRequestError('Please provide a valid email address')
    }

    if (email.length > 50) {
        throw new BadRequestError('Email cannot exceed 50 characters')
    }

    // ─── Mobile Validation ───────────────────────
    const mobileRegex = /^[6-9][0-9]{9}$/
    if (!mobileRegex.test(mobile)) {
        throw new BadRequestError(
            'Please provide a valid 10 digit Indian mobile number'
        )
    }

    // ─── Duplicate Enquiry Check ─────────────────
    // Same email + subject se already enquiry hai?
    const existingEnquiry = await Enquiry.findOne({
        email,
        subject
    })
    if (existingEnquiry) {
        throw new ConflictError(
            'You have already submitted an enquiry with this subject'
        )
    }

    // ─── Email Bhejo Pehle ───────────────────────
    const emailResult = await sendThankYouEmail(email, name)

    if (!emailResult.success) {
        throw new ServiceUnavailableError(
            'Failed to send email. Please try again later'
        )
    }

    const io = getIO();

    io.to(ADMIN_ROOM).emit("new-notification", {

        title: "New User Enquiry",

        message,

        createdAt: new Date()

    });

    const notification = await Notification.create({
        title: "User new Enquiry",
        message: message,
        notification_time: new Date()
    })

    // ─── DB mein Save karo ───────────────────────
    // Email successfully gayi toh hi save karo!
    const enquiry = await Enquiry.create({
        name,
        email,
        mobile,
        subject,
        message
    })

    // ─── Response ────────────────────────────────
    res.status(201).json({
        success: true,
        message: 'Enquiry submitted successfully! Check your email.',
        data: enquiry
    })
})

const getUserAllEnquiry = asyncHandler(async (req, res) => {
    const { role } = req.user

    // ─── Admin Check ──────────────────────────────
    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError(
            'Access denied. Only admin can access enquiries'
        )
    }

    // ─── Saari Enquiries Fetch karo ───────────────
    const enquiries = await Enquiry.find()
        .select('-__v')
        .sort({ createdAt: -1 }) // ← Latest pehle

    if (!enquiries.length) {
        return res.status(200).json({
            success: true,
            message: 'No enquiries found',
            total: 0,
            data: []
        })
    }

    // ─── Read + Unread Count ──────────────────────
    const unreadCount = enquiries.filter(e => !e.is_read).length
    const readCount = enquiries.filter(e => e.is_read).length

    res.status(200).json({
        success: true,
        message: 'Enquiries fetched successfully',
        total: enquiries.length,
        unreadCount,
        readCount,
        data: enquiries
    })
})

const seenUserEnquiry = asyncHandler(async (req, res) => {

    const { role } = req.user;
    const { enquiryId } = req.params;

    // ==========================================
    // Authorize Admin
    // ==========================================

    if (!["admin", "superadmin"].includes(role)) {
        throw new ForbiddenError(
            "You are not authorized to access this enquiry."
        );
    }

    // ==========================================
    // Find Enquiry
    // ==========================================

    const enquiry = await Enquiry.findById(enquiryId);

    if (!enquiry) {
        throw new NotFoundError(
            "Enquiry not found."
        );
    }

    // ==========================================
    // Mark as Read
    // ==========================================

    enquiry.is_read = true;

    await enquiry.save();

    // ==========================================
    // Response
    // ==========================================

    return res.status(200).json({

        success: true,

        message: "Enquiry marked as read successfully.",

        data: enquiry

    });

});

module.exports = { submituserEnquiry, getUserAllEnquiry, seenUserEnquiry }