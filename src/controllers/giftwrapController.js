const GiftWrap = require('../models/giftWrap.model')
const {
    asyncHandler,
    BadRequestError,
    NotFoundError,
    ConflictError
} = require('../errors/errorConfig')


const addWrapColor = asyncHandler(async (req, res) => {
    const { color, description, price } = req.body

    // ─── Required Fields ─────────────────────
    if (!color || !price) {
        throw new BadRequestError('Color and price are required')
    }

    // ─── Hex Color Validation ─────────────────
    // Valid: #fff, #ffffff, #FFF, #FFFFFF
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (!hexRegex.test(color)) {
        throw new BadRequestError(
            'Invalid color format. Only hex codes allowed. e.g. #fff or #ffffff'
        )
    }

    // ─── Price Validation ─────────────────────
    if (Number(price) < 0) {
        throw new BadRequestError('Price cannot be negative')
    }

    // ─── Duplicate Color Check ────────────────
    const existingColor = await GiftWrap.findOne({
        color: { $regex: new RegExp(`^${color}$`, 'i') }
        // #FFF aur #fff same hai
    })
    if (existingColor) {
        throw new ConflictError(
            `Wrap color "${color}" already exists`
        )
    }

    // ─── Save karo ───────────────────────────
    const wrapColor = await GiftWrap.create({
        color: color.toLowerCase(), // #ffffff format mein save
        description: description || '',
        price: Number(price)
    })

    res.status(201).json({
        success: true,
        message: 'Wrap color added successfully',
        data: wrapColor
    })
})

const getAllWrapColors = asyncHandler(async (req, res) => {

    const wrapColors = await GiftWrap.find()
        .select('-__v')
        .sort({ createdAt: -1 })

    if (!wrapColors.length) {
        return res.status(200).json({
            success: true,
            message: 'No wrap colors available',
            total: 0,
            data: []
        })
    }

    res.status(200).json({
        success: true,
        message: 'Wrap colors fetched successfully',
        total: wrapColors.length,
        data: wrapColors
    })
})


const removeWrapColor = asyncHandler(async (req, res) => {
    const { wrapId } = req.params

    const wrapColor = await GiftWrap.findById(wrapId)
    if (!wrapColor) {
        throw new NotFoundError('Wrap color not found')
    }

    await GiftWrap.findByIdAndDelete(wrapId)

    res.status(200).json({
        success: true,
        message: 'Wrap color removed successfully'
    })
})

module.exports = { addWrapColor, getAllWrapColors, removeWrapColor }