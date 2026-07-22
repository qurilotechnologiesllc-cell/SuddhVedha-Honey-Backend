const HoneyBenefits = require('../models/honeyBenefits.model')
const { asyncHandler, BadRequestError, UnauthorizedError, NotFoundError, ConflictError, ValidationError, ServiceUnavailableError } = require('../errors/errorConfig')
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary');

const addHoneyBenefitsByAdmin = asyncHandler(async (req, res) => {

    const { title, category, description } = req.body

    // ─── Validation ──────────────────────────────
    if (!title || !description) {
        throw new BadRequestError('Title and description are required')
    }

    // ─── Image Check ─────────────────────────────
    if (!req.file) {
        throw new BadRequestError('Image is required')
    }

    // ─── Duplicate Title Check ────────────────────
    const existing = await HoneyBenefits.findOne({
        title: { $regex: new RegExp(`^${title}$`, 'i') }
    })
    if (existing) {
        throw new ConflictError(`Benefit "${title}" already exists`)
    }

    // ─── Cloudinary Upload ────────────────────────
    const result = await uploadToCloudinary(
        req.file.buffer,
        'sudhvedahoney/benefits',
        'image'
    )

    // ─── DB mein Save karo ───────────────────────
    const benefit = await HoneyBenefits.create({
        title,
        description,
        category,
        image: result.secure_url,
        public_id: result.public_id
    })

    res.status(201).json({
        success: true,
        message: 'Honey benefit added successfully',
        data: benefit
    })
})

const getAllBenefits = asyncHandler(async (req, res) => {

    const { category } = req.params

    const benefits = await HoneyBenefits.find({ isActive: true, category: category })
        .select('title description image public_id createdAt')
        .sort({ createdAt: -1 })  // ← Latest pehle

    if (!benefits.length) {
        return res.status(200).json({
            success: true,
            message: 'No benefits found',
            total: 0,
            data: []
        })
    }

    res.status(200).json({
        success: true,
        message: 'Benefits fetched successfully',
        total: benefits.length,
        data: benefits
    })
})

const removeBenefitsByAdmin = asyncHandler(async (req, res) => {
    const { benefitId } = req.params

    // ─── Document Dhundo ──────────────────────────
    const benefit = await HoneyBenefits.findById(benefitId)
    if (!benefit) {
        throw new NotFoundError('Benefit not found')
    }

    // ─── Cloudinary se Image Delete karo ─────────
    await deleteFromCloudinary(benefit.public_id)

    // ─── DB se Delete karo ────────────────────────
    await HoneyBenefits.findByIdAndDelete(benefitId)

    res.status(200).json({
        success: true,
        message: 'Benefit removed successfully'
    })
})

module.exports = { addHoneyBenefitsByAdmin, getAllBenefits, removeBenefitsByAdmin }