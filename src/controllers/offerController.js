const Offers = require('../models/offer.model')
const CouponUsage = require('../models/couponUsage.model')
const { asyncHandler, BadRequestError, NotFoundError, ConflictError } = require('../errors/errorConfig')

const addOffer = asyncHandler(async (req, res) => {
    const {
        title,
        couponCode,
        discountType,
        discountValue
    } = req.body

    // ─── Required Fields ─────────────────────────
    if (!title || !couponCode || !discountType) {
        throw new BadRequestError(
            'Title, couponCode and discountType are required'
        )
    }

    // ─── discountType Validate ────────────────────
    const allowedTypes = ['FREE_SHIPPING', 'PERCENTAGE', 'FLAT']
    if (!allowedTypes.includes(discountType)) {
        throw new BadRequestError(
            'discountType must be FREE_SHIPPING, PERCENTAGE or FLAT'
        )
    }

    // ─── discountValue Validate ───────────────────
    if (discountType === 'FREE_SHIPPING') {
        // FREE_SHIPPING mein value 0 hi hogi
        // User chahe kuch bhi bheje
    } else if (discountType === 'PERCENTAGE') {
        if (!discountValue) {
            throw new BadRequestError(
                'discountValue is required for PERCENTAGE type'
            )
        }
        if (Number(discountValue) < 1 || Number(discountValue) > 100) {
            throw new BadRequestError(
                'Percentage discount must be between 1 and 100'
            )
        }
    } else if (discountType === 'FLAT') {
        if (!discountValue) {
            throw new BadRequestError(
                'discountValue is required for FLAT type'
            )
        }
        if (Number(discountValue) < 0) {
            throw new BadRequestError(
                'Flat discount value cannot be negative'
            )
        }
    }

    const existingCoupon = await Offers.findOne({
        couponCode: couponCode.toUpperCase()
    });

    if (existingCoupon) {
        throw new ConflictError("Coupon code already exists");
    }

    // ─── Save karo ───────────────────────────────
    const offer = await Offers.create({
        title,
        couponCode: couponCode.toUpperCase(),
        discountType,
        discountValue:
            discountType === "FREE_SHIPPING"
                ? 0
                : Number(discountValue),
    });

    res.status(201).json({
        success: true,
        message: 'Offer added successfully',
        data: offer
    })
});

const getAllOffers = asyncHandler(async (req, res) => {

    const offers = await Offers.find({ isActive: true })
        .select('-__v')

    if (!offers.length) {
        return res.status(200).json({
            success: true,
            message: 'No offers available',
            total: 0,
            data: []
        })
    }

    res.status(200).json({
        success: true,
        message: 'Offers fetched successfully',
        total: offers.length,
        data: offers
    })
})

const removeOffer = asyncHandler(async (req, res) => {
    const { offerId } = req.params

    // ─── Offer Exist Karta Hai? ──────────────────
    const offer = await Offers.findById(offerId)
    if (!offer) {
        throw new NotFoundError('Offer not found')
    }

    await Offers.findByIdAndDelete(offerId)

    res.status(200).json({
        success: true,
        message: 'Offer removed successfully'
    })
})


module.exports = { addOffer, getAllOffers, removeOffer }