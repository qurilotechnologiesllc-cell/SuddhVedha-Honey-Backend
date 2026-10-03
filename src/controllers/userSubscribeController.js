const SubscribeSchema = require('../models/subscribe.model')
const { asyncHandler, BadRequestError, ConflictError } = require('../errors/errorConfig')

const EMAIL_REGEX =
    /^(?!.*\.\.)[a-zA-Z0-9]([a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
const MOBILE_REGEX = /^[6-9]\d{9}$/

const SubmitDetails = asyncHandler(async (req, res) => {
    const { name, email, mobile } = req.body

    // 1. Email: required, string, max 50, valid format
    if (!email || typeof email !== 'string' || !email.trim()) {
        throw new BadRequestError('Email is required')
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (normalizedEmail.length > 50) {
        throw new BadRequestError('Email cannot exceed 50 characters')
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
        throw new BadRequestError('Please enter a valid email address')
    }

    // 2. Name: optional
    let cleanName
    if (name !== undefined && name !== null && String(name).trim() !== '') {
        cleanName = String(name).trim()
        if (cleanName.length > 100) {
            throw new BadRequestError('Name cannot exceed 100 characters')
        }
    }

    // 3. Mobile: optional, but valid if given
    let cleanMobile
    if (mobile !== undefined && mobile !== null && String(mobile).trim() !== '') {
        cleanMobile = String(mobile).trim()
        if (!MOBILE_REGEX.test(cleanMobile)) {
            throw new BadRequestError('Please enter a valid 10-digit mobile number')
        }
    }

    // 4. Duplicate check
    const alreadySubscribed = await SubscribeSchema.exists({ email: normalizedEmail })
    if (alreadySubscribed) {
        throw new ConflictError('This email is already subscribed')
    }

    // 5. Save (optional fields tabhi jayenge jab diye gaye ho)
    try {
        await SubscribeSchema.create({
            email: normalizedEmail,
            ...(cleanName && { name: cleanName }),
            ...(cleanMobile && { mobile: cleanMobile }),
        })
    } catch (err) {
        // Race condition: do requests ek saath aayi to unique index error dega
        if (err.code === 11000) {
            throw new ConflictError('This email is already subscribed')
        }
        throw err
    }

    return res.status(201).json({
        success: true,
        message: 'Subscribed successfully',
    })
})

const getAllSubscribeUser = asyncHandler(async (req, res) => {
    // Query params: ?page=1&limit=10&search=pritam&sort=desc
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100)
    const skip = (page - 1) * limit
    const sortOrder = req.query.sort === 'asc' ? 1 : -1

    // Optional search (email / name / mobile)
    const filter = {}
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

    if (search) {
        // Special regex characters escape karo (regex injection se bachne ke liye)
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escaped, 'i')
        filter.$or = [{ email: regex }, { name: regex }, { mobile: regex }]
    }

    const [subscribers, totalCount] = await Promise.all([
        SubscribeSchema.find(filter)
            .select('name email mobile createdAt')
            .sort({ createdAt: sortOrder })
            .skip(skip)
            .limit(limit)
            .lean(),
        SubscribeSchema.countDocuments(filter),
    ])

    return res.status(200).json({
        success: true,
        message: 'Subscribers fetched successfully',
        data: subscribers,
        pagination: {
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            limit,
            hasNextPage: page * limit < totalCount,
            hasPrevPage: page > 1,
        },
    })
})


module.exports = { SubmitDetails, getAllSubscribeUser }