const HoneyBenefits = require('../models/honeyBenefits.model')
const cloudinary = require('../config/cloudinary')
const { asyncHandler, BadRequestError, UnauthorizedError, NotFoundError, ConflictError, ValidationError, ServiceUnavailableError } = require('../errors/errorConfig')
const { uploadVideoToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary');

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
    const result = await uploadVideoToCloudinary(
        req.file.buffer,
        'sudhvedahoney/benefitsvideo'
    )

    // ─── DB mein Save karo ───────────────────────
    const benefit = await HoneyBenefits.create({
        title,
        category,
        public_id: result.public_id,
        duration: result.duration,
        format: result.format
    })


      const videoUrl = cloudinary.url(benefit.public_id, {
            resource_type: "video",
            secure: true
        });
    
        const thumbnailUrl = cloudinary.url(benefit.public_id, {
            resource_type: "video",
            secure: true,
            format: "jpg",
            transformation: [
                {
                    start_offset: "2"
                },
                {
                    width: 500,
                    crop: "fill"
                }
            ]
        });

    res.status(201).json({
        success: true,
        message: 'Honey benefit added successfully',
        data: {
            _id: benefit._id,

            public_id: benefit.public_id,

            duration: benefit.duration,

            format: benefit.format,

            video_url: videoUrl,

            thumbnail_url: thumbnailUrl

        }
    })
})

const getAllBenefits = asyncHandler(async (req, res) => {

    const { category } = req.params

    const benefits = await HoneyBenefits.find({
        isActive: true,
        category
    })
        .select('title description public_id duration format createdAt')
        .sort({ createdAt: -1 })

    if (!benefits.length) {
        return res.status(200).json({
            success: true,
            message: 'No benefits found',
            total: 0,
            data: []
        })
    }

    // ─── Har Benefit ke liye Video + Thumbnail URL banao
    const benefitsWithUrls = benefits.map(benefit => {

        // ── Video URL ─────────────────────────────
        const videoUrl = cloudinary.url(benefit.public_id, {
            resource_type: 'video',
            secure: true
        })

        // ── Thumbnail URL ─────────────────────────
        const thumbnailUrl = cloudinary.url(benefit.public_id, {
            resource_type: 'video',
            secure: true,
            format: 'jpg',
            transformation: [
                { start_offset: '2' },
                { width: 500, crop: 'fill' }
            ]
        })

        return {
            _id: benefit._id,
            title: benefit.title,
            description: benefit.description,
            duration: benefit.duration,
            format: benefit.format,
            createdAt: benefit.createdAt,
            video_url: videoUrl,      // ← Video URL ✅
            thumbnail_url: thumbnailUrl  // ← Thumbnail URL ✅
        }
    })

    res.status(200).json({
        success: true,
        message: 'Benefits fetched successfully',
        total: benefitsWithUrls.length,
        data: benefitsWithUrls
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
    await deleteFromCloudinary(benefit.public_id, "video")

    // ─── DB se Delete karo ────────────────────────
    await HoneyBenefits.findByIdAndDelete(benefitId)

    res.status(200).json({
        success: true,
        message: 'Benefit removed successfully'
    })
})

module.exports = { addHoneyBenefitsByAdmin, getAllBenefits, removeBenefitsByAdmin }