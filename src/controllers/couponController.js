const Offers = require('../models/offer.model')
const CouponUsage = require('../models/couponUsage.model')
const { asyncHandler, BadRequestError, NotFoundError, ConflictError } = require('../errors/errorConfig')

const applyCoupon = asyncHandler(async (req, res) => {

    const {
        couponCode
    } = req.body;

    const userId = req.user.id;


    /*
    |--------------------------------------------------------------------------
    | 1. Validate Coupon Code
    |--------------------------------------------------------------------------
    */

    if (!couponCode) {
        throw new BadRequestError(
            "Coupon code is required"
        );
    }


    const normalizedCouponCode =
        couponCode
            .trim()
            .toUpperCase();


    /*
    |--------------------------------------------------------------------------
    | 2. Find Coupon
    |--------------------------------------------------------------------------
    */

    const offer =
        await Offers.findOne({

            couponCode:
                normalizedCouponCode,

            isActive:
                true

        });


    if (!offer) {
        throw new NotFoundError(
            "Invalid or inactive coupon"
        );
    }


    /*
    |--------------------------------------------------------------------------
    | 3. Check Existing Coupon Usage
    |--------------------------------------------------------------------------
    */

    const existingUsage =
        await CouponUsage.findOne({

            userId,

            offerId:
                offer._id

        });


    if (existingUsage) {

        if (
            !existingUsage.isAvailable
        ) {

            throw new ConflictError(
                `You have already used coupon "${offer.couponCode}"`
            );

        }


        if (
            existingUsage.isApplied
        ) {

            throw new ConflictError(
                `Coupon "${offer.couponCode}" is already applied`
            );

        }

    }


    /*
    |--------------------------------------------------------------------------
    | 4. Create / Update Coupon Usage
    |--------------------------------------------------------------------------
    */

    if (existingUsage) {

        existingUsage.couponCode =
            offer.couponCode;

        existingUsage.isAvailable =
            true;

        existingUsage.isApplied =
            true;

        existingUsage.orderId =
            null;

        await existingUsage.save();

    } else {

        await CouponUsage.create({

            userId,

            offerId:
                offer._id,

            orderId:
                null,

            couponCode:
                offer.couponCode,

            isAvailable:
                true,

            isApplied:
                true

        });

    }


    /*
    |--------------------------------------------------------------------------
    | 5. Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({

        success: true,

        message:
            "Coupon applied successfully",

        coupon: {

            offerId:
                offer._id,

            couponCode:
                offer.couponCode,

            discountType:
                offer.discountType,

            discountValue:
                offer.discountValue

        }

    });

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


    // ─────────────────────────────────────
    // Find Applied Coupon Usage
    // ─────────────────────────────────────

    const couponUsage = await CouponUsage.findOne({

        userId,

        offerId,

        isAvailable: true,

        isApplied: true

    });


    if (!couponUsage) {

        throw new NotFoundError(
            "Coupon is not applied or cannot be removed."
        );

    }


    // ─────────────────────────────────────
    // Remove Coupon Usage
    // ─────────────────────────────────────

    await CouponUsage.findByIdAndDelete(
        couponUsage._id
    );


    // ─────────────────────────────────────
    // Response
    // ─────────────────────────────────────

    return res.status(200).json({

        success: true,

        message:
            `Coupon "${couponUsage.couponCode}" removed successfully`

    });

});

module.exports = { applyCoupon, getAvailableCoupon, removeCouponByUser }


