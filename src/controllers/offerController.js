const Offers = require('../models/offer.model')
const CouponUsage = require('../models/couponUsage.model')
const { asyncHandler, BadRequestError, NotFoundError, ConflictError } = require('../errors/errorConfig')

const addOffer = asyncHandler(async (req, res) => {
    const {
        couponCode,
        minimumOrderAmount,
        discountType,
        discountValue,
        maximumDiscount,
        description
    } = req.body

    // ─── Required Fields ─────────────────────────
    if (!couponCode || !minimumOrderAmount || !discountType || !description) {
        throw new BadRequestError(
            'Title, minimumOrderAmount and discountType are required'
        )
    }

    // ─── discountType Validate ────────────────────
    const allowedTypes = ['FREE_SHIPPING', 'PERCENTAGE', 'FLAT']
    if (!allowedTypes.includes(discountType)) {
        throw new BadRequestError(
            'discountType must be FREE_SHIPPING, PERCENTAGE or FLAT'
        )
    }

    // ─── minimumOrderAmount Validate ──────────────
    if (Number(minimumOrderAmount) < 0) {
        throw new BadRequestError(
            'Minimum order amount cannot be negative'
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
        couponCode: couponCode.toUpperCase(),
        minimumOrderAmount: Number(minimumOrderAmount),
        discountType,
        discountValue:
            discountType === "FREE_SHIPPING"
                ? 0
                : Number(discountValue),
        maximumDiscount:
            discountType === "PERCENTAGE"
                ? Number(maximumDiscount) || null
                : null,
        description,
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
        .sort({ minimumOrderAmount: 1 })
    // ↑ Sabse kam amount wala offer pehle

    const usedCoupons = await CouponUsage.find({
        userId: req.user.id
    }).select("couponCode");


    const usedCouponCodes = usedCoupons.map(c => c.couponCode);

    const availableCoupons = offers.filter(
        offer => !usedCouponCodes.includes(offer.couponCode)
    );

    if (!availableCoupons.length) {
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
        total: availableCoupons.length,
        data: availableCoupons
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

const applyCoupon = asyncHandler(async (req, res) => {

    const { couponCode, cartAmount, shippingCharge = 0 } = req.body;

    const offer = await Offers.findOne({
        couponCode: couponCode.toUpperCase(),
        isActive: true,
    });

    if (!offer) {
        throw new NotFoundError("Invalid coupon");
    }

    if (cartAmount < offer.minimumOrderAmount) {
        throw new BadRequestError(
            `Minimum order amount should be ₹${offer.minimumOrderAmount}`
        );
    }

    let discount = 0;
    let shipping = shippingCharge;

    switch (offer.discountType) {

        case "FLAT":
            discount = offer.discountValue;
            break;

        case "PERCENTAGE":
            discount =
                (cartAmount * offer.discountValue) / 100;

            if (
                offer.maximumDiscount &&
                discount > offer.maximumDiscount
            ) {
                discount = offer.maximumDiscount;
            }

            break;

        case "FREE_SHIPPING":
            shipping = 0;
            break;
    }

    const finalAmount = Math.max(
        cartAmount - discount + shipping,
        0
    );

    res.status(200).json({
        success: true,
        coupon: offer.couponCode,
        discount,
        shipping,
        payableAmount: finalAmount,
        offer,
    });
});


module.exports = { addOffer, getAllOffers, removeOffer, applyCoupon }