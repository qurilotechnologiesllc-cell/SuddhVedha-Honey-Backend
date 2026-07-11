const GiftBox = require('../models/giftBox.model')
const {
    asyncHandler,
    BadRequestError,
    NotFoundError,
    ConflictError
} = require('../errors/errorConfig')
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')

const addGiftBox = asyncHandler(async (req, res) => {
    const { name, description, price, sortOrder } = req.body

    // ─── Validation ─────────────────────────────
    if (!name || !price) {
        throw new BadRequestError('Name and price are required')
    }

    if (price < 0) {
        throw new BadRequestError('Price cannot be negative')
    }

    // ─── Image Required Check ────────────────────
    if (!req.file) {
        throw new BadRequestError('Gift box image is required')
    }

    // ─── Duplicate Name Check ────────────────────
    const existingBox = await GiftBox.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') }
    })
    if (existingBox) {
        throw new ConflictError(
            `Gift box with name "${name}" already exists`
        )
    }

    // ─── Image Upload Cloudinary ─────────────────
    const result = await uploadToCloudinary(
        req.file.buffer,
        'sudhvedahoney/giftboxes',
        'image'
    )

    // ─── GiftBox Save karo ───────────────────────
    const giftBox = await GiftBox.create({
        name,
        description: description || '',
        price: Number(price),
        image: result.secure_url,
        public_id: result.public_id,  // Delete ke liye
        sortOrder: Number(sortOrder) || 0,
        isActive: true
    })

    res.status(201).json({
        success: true,
        message: 'Gift box added successfully',
        data: giftBox
    })
});

const getAllGiftBoxes = asyncHandler(async (req, res) => {

    // ─── Sirf Active boxes dikhao users ko ──────
    const giftBoxes = await GiftBox.find({ isActive: true })
        .select('-createdBy -__v')  // Admin info hide karo
        .sort({ sortOrder: 1, createdAt: -1 })


    if (!giftBoxes.length) {
        return res.status(200).json({
            success: true,
            message: 'No gift boxes available',
            total: 0,
            data: []
        })
    }

    res.status(200).json({
        success: true,
        message: 'Gift boxes fetched successfully',
        total: giftBoxes.length,
        data: giftBoxes
    })
});

const removeGiftBox = asyncHandler(async (req, res) => {
    const { giftBoxId } = req.params

    // ─── GiftBox Exist Karta Hai? ────────────────
    const giftBox = await GiftBox.findById(giftBoxId)
    if (!giftBox) {
        throw new NotFoundError('Gift box not found')
    }

    console.log(giftBox.public_id);
    

    // ─── Cloudinary se Image Delete Karo ─────────
    if (giftBox.public_id) {
        await deleteFromCloudinary(giftBox.public_id)
    }

    // ─── DB se Delete Karo ───────────────────────
    await GiftBox.findByIdAndDelete(giftBoxId)

    res.status(200).json({
        success: true,
        message: 'Gift box removed successfully'
    })
})


module.exports = { addGiftBox, getAllGiftBoxes, removeGiftBox }