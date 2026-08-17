const InfluencerDetails = require('../models/influencerDetails.model')
const {
    asyncHandler,
    BadRequestError,
    ConflictError,
} = require('../errors/errorConfig')


const submitInfluencerDetails = asyncHandler(async (req, res) => {
    const {
        name,
        phoneNumber,
        email,
        username,
        numberOfFollowers,
        fullAddress,
        city,
        pinCode,
        influencerGeneric,
    } = req.body

    // -----------------------------
    // Required field validation
    // -----------------------------

    if (!name || !name.trim()) {
        throw new BadRequestError('Name is required')
    }

    if (!phoneNumber || !phoneNumber.trim()) {
        throw new BadRequestError('Phone number is required')
    }

    if (!email || !email.trim()) {
        throw new BadRequestError('Email is required')
    }

    if (!username || !username.trim()) {
        throw new BadRequestError('Username is required')
    }

    if (
        numberOfFollowers === undefined ||
        numberOfFollowers === null ||
        numberOfFollowers === ''
    ) {
        throw new BadRequestError(
            'Number of followers is required'
        )
    }

    if (!fullAddress || !fullAddress.trim()) {
        throw new BadRequestError('Full address is required')
    }

    if (!city || !city.trim()) {
        throw new BadRequestError('City is required')
    }

    if (!pinCode || !pinCode.trim()) {
        throw new BadRequestError('Pin code is required')
    }

    if (!influencerGeneric || !influencerGeneric.trim()) {
        throw new BadRequestError(
            'Influencer generic is required'
        )
    }

    // -----------------------------
    // Phone number validation
    // -----------------------------

    const cleanedPhoneNumber = phoneNumber.trim()

    if (!/^[0-9]{10}$/.test(cleanedPhoneNumber)) {
        throw new BadRequestError(
            'Phone number must contain exactly 10 digits'
        )
    }

    // -----------------------------
    // Email validation
    // -----------------------------

    const cleanedEmail = email.trim().toLowerCase()

    if (cleanedEmail.length > 50) {
        throw new BadRequestError(
            'Email cannot exceed 50 characters'
        )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
        throw new BadRequestError(
            'Please provide a valid email address'
        )
    }

    // -----------------------------
    // Followers validation
    // -----------------------------

    const followers = Number(numberOfFollowers)

    if (isNaN(followers) || followers < 0) {
        throw new BadRequestError(
            'Number of followers must be a valid positive number'
        )
    }

    // -----------------------------
    // Check duplicate details
    // -----------------------------

    const existingInfluencer = await InfluencerDetails.findOne({
        $or: [
            { email: cleanedEmail },
            { phoneNumber: cleanedPhoneNumber },
            { username: username.trim() },
        ],
    })

    if (existingInfluencer) {
        if (existingInfluencer.email === cleanedEmail) {
            throw new ConflictError(
                'An influencer with this email already exists'
            )
        }

        if (
            existingInfluencer.phoneNumber ===
            cleanedPhoneNumber
        ) {
            throw new ConflictError(
                'An influencer with this phone number already exists'
            )
        }

        if (
            existingInfluencer.username === username.trim()
        ) {
            throw new ConflictError(
                'An influencer with this username already exists'
            )
        }
    }

    // -----------------------------
    // Create influencer details
    // -----------------------------

    const influencer = await InfluencerDetails.create({
        name: name.trim(),
        phoneNumber: cleanedPhoneNumber,
        email: cleanedEmail,
        username: username.trim(),
        numberOfFollowers: followers,
        fullAddress: fullAddress.trim(),
        city: city.trim(),
        pinCode: pinCode.trim(),
        influencerGeneric: influencerGeneric.trim(),

        // Schema default
        isRead: false,
    })

    return res.status(201).json({
        success: true,
        message: 'Influencer details submitted successfully',
        data: influencer,
    })
})

const getAllInfluencerDetails = asyncHandler(async (req, res) => {
    const { role } = req.user

    // Only admin can access influencer details
    if (role !== 'admin') {
        throw new UnauthorizedError(
            'Only admin can access influencer details'
        )
    }

    const influencers = await InfluencerDetails.find({})
        .sort({ createdAt: -1 })
        .lean()

    return res.status(200).json({
        success: true,
        message: 'Influencer details fetched successfully',
        count: influencers.length,
        data: influencers,
    })
})

const removeInfluencerDetails = asyncHandler(async (req, res) => {
    const { id } = req.params
    const { role } = req.user

    // Only admin can remove influencer details
    if (role !== 'admin') {
        throw new UnauthorizedError(
            'Only admin can remove influencer details'
        )
    }

    // Validate ID
    if (!id) {
        throw new BadRequestError(
            'Influencer ID is required'
        )
    }

    // Check if influencer exists
    const influencer = await InfluencerDetails.findById(id)

    if (!influencer) {
        throw new NotFoundError(
            'Influencer details not found'
        )
    }

    // Remove influencer details
    await InfluencerDetails.findByIdAndDelete(id)

    return res.status(200).json({
        success: true,
        message: 'Influencer details removed successfully',
        data: {
            id: influencer._id,
            name: influencer.name,
            email: influencer.email,
        },
    })
})

const seenDetails = asyncHandler(async (req, res) => {
    const { id } = req.params
    const { role } = req.user

    // Only admin can mark influencer details as read
    if (role !== 'admin') {
        throw new UnauthorizedError(
            'Only admin can view influencer details'
        )
    }

    // Validate ID
    if (!id) {
        throw new BadRequestError(
            'Influencer ID is required'
        )
    }

    // Find and mark as read
    const influencer = await InfluencerDetails.findByIdAndUpdate(
        id,
        {
            $set: {
                isRead: true,
            },
        }
    )

    if (!influencer) {
        throw new NotFoundError(
            'Influencer details not found'
        )
    }

    return res.status(200).json({
        success: true,
        message: 'Influencer details marked as read successfully',
        data: influencer,
    })
})


module.exports = {
    submitInfluencerDetails,
    getAllInfluencerDetails,
    removeInfluencerDetails,
    seenDetails
}