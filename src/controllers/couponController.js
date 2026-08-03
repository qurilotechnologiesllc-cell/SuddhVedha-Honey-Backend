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

    let discount = 0;
    let shipping = shippingCharge;

    switch (offer.discountType) {

        case "FLAT":
            discount = offer.discountValue;
            break;

        case "PERCENTAGE":
            discount =
                (cartAmount * offer.discountValue) / 100;
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
        isApplied: true,
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
    const userId = req.user.id;

    // User ke coupon records
    const couponUsages = await CouponUsage.find({ userId })
        .select("offerId isAvailable isApplied");

    // Applied coupons
    const appliedOfferIds = new Set();

    // Permanently used coupons
    const hiddenOfferIds = new Set();

    couponUsages.forEach((coupon) => {
        const offerId = coupon.offerId.toString();

        // Cart me applied hai
        if (coupon.isAvailable && coupon.isApplied) {
            appliedOfferIds.add(offerId);
        }

        // Order complete ho gaya
        if (!coupon.isAvailable && coupon.isApplied) {
            hiddenOfferIds.add(offerId);
        }
    });

    console.log(hiddenOfferIds);
    

    // Active offers
    const offers = await Offers.find({ isActive: true })
        .select("-createdAt -updatedAt -isActive -__v");

    if (!offers.length) {
        return res.status(200).json({
            success: true,
            message: "No offers available",
            total: 0,
            data: [],
        });
    }

    // Used coupons hata do
    const filteredOffers = offers
        .filter(
            (offer) => !hiddenOfferIds.has(offer._id.toString())
        )
        .map((offer) => ({
            ...offer.toObject(),

            // Frontend ke liye
            isApplied: appliedOfferIds.has(
                offer._id.toString()
            ),
        }));

    return res.status(200).json({
        success: true,
        message: "Offers fetched successfully",
        total: filteredOffers.length,
        data: filteredOffers,
    });
});

const removeCouponByUser = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { offerId } = req.params;

    // Sirf currently applied coupon hi remove hoga
    const couponUsage = await CouponUsage.findOne({
        userId,
        offerId,
        isAvailable: true,
        isApplied: true,
    });

    if (!couponUsage) {
        throw new NotFoundError(
            "Coupon is not applied or cannot be removed."
        );
    }

    await CouponUsage.findByIdAndDelete(couponUsage._id);

    res.status(200).json({
        success: true,
        message: `Coupon "${couponUsage.couponCode}" removed successfully`,
    });
});

module.exports = { applyCoupon, getAvailableCoupon, removeCouponByUser }


