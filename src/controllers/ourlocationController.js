const OurOfficeLocation = require('../models/location.model')
const {
    asyncHandler,
    BadRequestError,
    ConflictError
} = require('../errors/errorConfig')

const addOurLocation = asyncHandler(async (req, res) => {

    const {
        phone,
        phone_timing,      // ← Optional
        email,
        email_reply_time,  // ← Optional
        whatsapp,
        whatsapp_timing,   // ← Optional
        address,
        map_embed_url
    } = req.body

    // ─── Required Fields Check ────────────────────
    if (!phone || !email || !whatsapp || !map_embed_url) {
        throw new BadRequestError(
            'phone, email, whatsapp and map_embed_url are required'
        )
    }

    // ─── Address Check ────────────────────────────
    if (!address || !address.line1 || !address.city ||
        !address.state || !address.pincode) {
        throw new BadRequestError(
            'address.line1, address.city, address.state and address.pincode are required'
        )
    }

    // ─── Phone Validation ─────────────────────────
    const phoneRegex = /^[6-9][0-9]{9}$/
    if (!phoneRegex.test(phone)) {
        throw new BadRequestError(
            'Invalid phone number. Must be 10 digits starting with 6-9'
        )
    }

    // ─── Email Validation ─────────────────────────
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
        throw new BadRequestError(
            'Invalid email address'
        )
    }

    // ─── WhatsApp Validation ──────────────────────
    if (!phoneRegex.test(whatsapp)) {
        throw new BadRequestError(
            'Invalid WhatsApp number. Must be 10 digits starting with 6-9'
        )
    }

    // ─── Pincode Validation ───────────────────────
    const pincodeRegex = /^[1-9][0-9]{5}$/
    if (!pincodeRegex.test(address.pincode)) {
        throw new BadRequestError(
            'Invalid pincode. Must be 6 digits'
        )
    }

    // ─── Already Exist Check ──────────────────────
    // Ek hi location honi chahiye
    const existingLocation = await OurOfficeLocation.findOne()
    if (existingLocation) {
        throw new ConflictError(
            'Location already exists. Please update instead of adding new'
        )
    }

    // ─── Save karo ───────────────────────────────
    const location = await OurOfficeLocation.create({
        phone,
        phone_timing: phone_timing || 'Mon - Sat: 9AM - 6PM',
        email: email.toLowerCase().trim(),
        email_reply_time: email_reply_time || 'We reply within 24 hrs',
        whatsapp,
        whatsapp_timing: whatsapp_timing || 'Mon - Sat: 9AM - 6PM',
        address: {
            line1: address.line1,
            line2: address.line2 || '',
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country || 'India'
        },
        map_embed_url
    })

    res.status(201).json({
        success: true,
        message: 'Office location added successfully',
        data: location
    })
});

const getLocations = asyncHandler(async (req, res) => {

    const location = await OurOfficeLocation.findOne({ isActive: true })
        .select('-__v')

    if (!location) {
        throw new NotFoundError('Location not found')
    }

    res.status(200).json({
        success: true,
        message: 'Location fetched successfully',
        data: location
    })
});

const removeLocation = asyncHandler(async (req, res) => {

    // ─── Location Exist Karti Hai? ───────────────
    const location = await OurOfficeLocation.findOne()
    if (!location) {
        throw new NotFoundError('No location found to remove')
    }

    // ─── Delete karo ─────────────────────────────
    await OurOfficeLocation.deleteOne()

    res.status(200).json({
        success: true,
        message: 'Location removed successfully'
    })
})


module.exports = { addOurLocation, getLocations, removeLocation }