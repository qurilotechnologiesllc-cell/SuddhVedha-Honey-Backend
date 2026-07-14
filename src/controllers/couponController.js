const Offers = require('../models/offer.model')
const CouponUsage = require('../models/couponUsage.model')
const { asyncHandler, BadRequestError, NotFoundError, ConflictError } = require('../errors/errorConfig')

const applyCoupon = asyncHandler(async (req, res) => {

    const { couponCode, cartAmount, shippingCharge = 0 } = req.body;
    const userId = req.user.id

    const offer = await Offers.findOne({
        couponCode: couponCode.toUpperCase(),
        isActive: true,
    });

    if (!offer) {
        throw new NotFoundError("Invalid coupon");
    }

    // ─── Already Use Kiya Check ──────────────────
    const alreadyUsed = await CouponUsage.findOne({
        userId,                              // Is user ne
        couponCode: couponCode.toUpperCase() // Yeh coupon
    })

    if (alreadyUsed) {
        throw new ConflictError(
            `You have already used coupon "${couponCode.toUpperCase()}"`
        )
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

    await CouponUsage.create({
        userId,
        offerId: offer._id,
        couponCode: couponCode.toUpperCase().trim(),
    })

    res.status(200).json({
        success: true,
        message: 'Coupon applied successfully',
        data: {
            couponCode: offer.couponCode,
            title: offer.title,
            discountType: offer.discountType,
            discountValue: offer.discountValue,
            discount,
            originalAmount: cartAmount,
            shipping,
            finalAmount,

            // Frontend ke liye display info
            display: {
                label: offer.discountType === 'FREE_SHIPPING'
                    ? 'FREE DELIVERY'
                    : `₹${discount} OFF`,
                description: offer.title
            }
        }
    })
});

const getAvailableCoupon = asyncHandler(async (req, res) => {

    const userId = req.user.id

    // ─── Step 1: User ke used coupons dhundo ─────
    // offerId list milegi
    const usedCoupons = await CouponUsage.find({ userId })
        .select('offerId couponCode')

    // Used offerIds ka Set banao — fast lookup ke liye
    const usedOfferIds = new Set(
        usedCoupons.map(c => c.offerId.toString())
    )

    // ─── Step 2: Saare active offers fetch karo ──
    const offers = await Offers.find({ isActive: true })
        .select('-createdAt -updatedAt -__v')
        .sort({ minimumOrderAmount: 1 })

    if (!offers.length) {
        return res.status(200).json({
            success: true,
            message: 'No offers available',
            total: 0,
            data: []
        })
    }

    // ─── Step 3: isAvailable flag add karo ───────
    // offerId match → isAvailable: false
    // offerId match nahi → isAvailable: true
    const offersWithAvailability = offers.map(offer => ({
        ...offer.toObject(),
        isAvailable: !usedOfferIds.has(offer._id.toString())
        //                          ↑
        // used mein hai → false (already used)
        // used mein nahi → true (use kar sakte ho)
    }))

    res.status(200).json({
        success: true,
        message: 'Offers fetched successfully',
        total: offersWithAvailability.length,
        data: offersWithAvailability
    })
})

const removeCouponByUser = asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { offerId } = req.params

    // ─── Document Dhundo ──────────────────────────
    const couponUsage = await CouponUsage.findOne({
        userId,
        offerId
    })

    if (!couponUsage) {
        throw new NotFoundError('Coupon not found or already removed')
    }

    // ─── Delete karo ──────────────────────────────
    await CouponUsage.findByIdAndDelete(couponUsage._id)

    res.status(200).json({
        success: true,
        message: `Coupon "${couponUsage.couponCode}" removed successfully`
    })
})

module.exports = { applyCoupon, getAvailableCoupon, removeCouponByUser }


