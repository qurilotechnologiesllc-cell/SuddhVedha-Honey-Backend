const Enquiry = require('../models/userEnquiry.model')
const sendThankYouEmail = require('../utils/sendEmail')
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


module.exports = { submituserEnquiry }