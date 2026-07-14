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
        usedAt: new Date()
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

const getAvaliableCoupon = asyncHandler(async (req, res) => {

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

module.exports = { applyCoupon, getAvaliableCoupon }


