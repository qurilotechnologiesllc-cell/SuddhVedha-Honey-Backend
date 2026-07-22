const UpcomingProducts = require('../models/upcomingProducts.model')
const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } = require('../errors/errorConfig')
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')

const uploadUpcomingProducts = asyncHandler(async (req, res) => {
    const {
        title,
        subtitle,
        tag,
        product_name,
        product_description,
        features,
        launch_date,
        pre_order_url
    } = req.body

    // ─── Required Fields ─────────────────────────
    if (!title || !product_name || !launch_date) {
        throw new BadRequestError(
            'title, product_name and launch_date are required'
        )
    }

    // ─── Image Check ─────────────────────────────
    if (!req.file) {
        throw new BadRequestError('Banner image is required')
    }

    // ─── Launch Date Validate ─────────────────────
    const launchDate = new Date(launch_date)
    if (isNaN(launchDate.getTime())) {
        throw new BadRequestError(
            'Invalid launch date format. Use ISO format: 2026-08-01T10:00:00.000Z'
        )
    }

    // Launch date future mein honi chahiye
    if (launchDate <= new Date()) {
        throw new BadRequestError(
            'Launch date must be a future date'
        )
    }

    // ─── Already Active Banner Hai? ──────────────
    // Ek hi active banner hoga
    const existingBanner = await UpcomingProducts.findOne({
        isActive: true,
        tag: tag
    })
    if (existingBanner) {
        throw new ConflictError(
            'An active banner already exists. Please remove it first'
        )
    }

    // ─── Features Parse karo ─────────────────────
    // Postman form-data se string aati hai
    // JSON.parse karo agar string hai
    let parsedFeatures = []
    if (features) {
        parsedFeatures = typeof features === 'string'
            ? JSON.parse(features)
            : features
    }

    // ─── Cloudinary Upload ────────────────────────
    const result = await uploadToCloudinary(
        req.file.buffer,
        'sudhvedahoney/banners',
        'image'
    )

    // ─── Save karo ───────────────────────────────
    const banner = await UpcomingProducts.create({
        title,
        subtitle: subtitle || 'Something sweet is on the way',
        tag: tag || 'COMING SOON',
        product_name,
        product_description: product_description || '',
        features: parsedFeatures,
        banner_image: result.secure_url,
        public_id: result.public_id,
        launch_date: launchDate,
        pre_order_url: pre_order_url || '#',
        isActive: true
    })

    res.status(201).json({
        success: true,
        message: 'Upcoming product banner added successfully',
        data: banner
    })
})

const getBanner = asyncHandler(async (req, res) => {

    const banner = await UpcomingProducts.findOne({ isActive: true })
        .select('-__v -public_id -createdAt -updatedAt')

    if (!banner) {
        return res.status(200).json({
            success: true,
            message: 'No upcoming product',
            data: null
        })
    }

    res.status(200).json({
        success: true,
        launched: false,
        data: {
            banner
        }
    })
})

const removeUpcomingBanners = asyncHandler(async (req, res) => {
    const { bannerId } = req.params

    // ─── Banner Dhundo ────────────────────────────
    const banner = await UpcomingProducts.findById(bannerId)
    if (!banner) {
        throw new NotFoundError('Banner not found')
    }

    // ─── Cloudinary se Delete ─────────────────────
    if (banner.public_id) {
        await deleteFromCloudinary(banner.public_id)
    }

    // ─── DB se Delete ─────────────────────────────
    await UpcomingProducts.findByIdAndDelete(bannerId)

    res.status(200).json({
        success: true,
        message: 'Banner removed successfully'
    })
})

module.exports = { uploadUpcomingProducts, getBanner, removeUpcomingBanners }