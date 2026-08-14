const Offers = require('../models/offer.model')
const CouponUsage = require('../models/couponUsage.model')
const Cart = require('../models/cart.model')
const Giftcart = require('../models/giftCart.model')
const { asyncHandler, BadRequestError, NotFoundError, ConflictError } = require('../errors/errorConfig')

const applyCoupon = asyncHandler(async (req, res) => {

    const {
        couponCode,
        itemId,
        itemType
    } = req.body;

    const userId = req.user.id;

    // ─────────────────────────────────────
    // Validate
    // ─────────────────────────────────────

    if (!couponCode) {
        throw new BadRequestError("Coupon code is required");
    }

    if (!itemId) {
        throw new BadRequestError("Item id is required");
    }

    if (!itemType) {
        throw new BadRequestError("Item type is required");
    }

    if (!["NORMAL", "CUSTOM"].includes(itemType)) {
        throw new BadRequestError(
            "Invalid item type"
        );
    }


    // ─────────────────────────────────────
    // Find Coupon
    // ─────────────────────────────────────

    const offer = await Offers.findOne({
        couponCode: couponCode.trim().toUpperCase(),
        isActive: true
    });

    if (!offer) {
        throw new NotFoundError("Invalid coupon");
    }


    // ─────────────────────────────────────
    // Already Used
    // ─────────────────────────────────────

    const alreadyUsed = await CouponUsage.findOne({
        userId,
        offerId: offer._id
    });

    if (alreadyUsed) {
        throw new ConflictError(
            `You have already used coupon "${offer.couponCode}"`
        );
    }


    // ─────────────────────────────────────
    // NORMAL → Cart
    // ─────────────────────────────────────

    if (itemType === "NORMAL") {

        const cart = await Cart.findOne({
            userId,
            "items._id": itemId
        });

        if (!cart) {
            throw new NotFoundError(
                "Cart item not found"
            );
        }

        const item = cart.items.id(itemId);

        if (!item) {
            throw new NotFoundError(
                "Cart item not found"
            );
        }

        if (item.couponId) {
            throw new ConflictError(
                "Coupon already applied on this item"
            );
        }

        // Apply coupon ID
        item.couponId = offer._id;

        await cart.save();
    }


    // ─────────────────────────────────────
    // CUSTOM → GiftCart
    // ─────────────────────────────────────

    if (itemType === "CUSTOM") {

        const giftCart = await Giftcart.findOne({
            userId,
            "items._id": itemId
        });

        if (!giftCart) {
            throw new NotFoundError(
                "Gift cart item not found"
            );
        }

        const item = giftCart.items.id(itemId);

        if (!item) {
            throw new NotFoundError(
                "Gift cart item not found"
            );
        }

        if (item.couponId) {
            throw new ConflictError(
                "Coupon already applied on this item"
            );
        }

        // Apply coupon ID
        item.couponId = offer._id;

        await giftCart.save();
    }


    // ─────────────────────────────────────
    // Save Coupon Usage
    // ─────────────────────────────────────

    await CouponUsage.create({
        userId,
        offerId: offer._id,
        itemId,
        itemType,
        couponCode: offer.couponCode,
        isAvailable: true,
        isApplied: true
    });


    // ─────────────────────────────────────
    // Response
    // ─────────────────────────────────────

    return res.status(200).json({
        success: true,
        message: "Coupon applied successfully"
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
        isApplied: true,
    });

    if (!couponUsage) {
        throw new NotFoundError(
            "Coupon is not applied or cannot be removed."
        );
    }


    const {
        itemId,
        itemType
    } = couponUsage;


    // ─────────────────────────────────────
    // NORMAL → Cart
    // ─────────────────────────────────────

    if (itemType === "NORMAL") {

        const cart = await Cart.findOne({
            userId,
            "items._id": itemId
        });

        if (!cart) {
            throw new NotFoundError(
                "Cart item not found."
            );
        }

        const item = cart.items.id(itemId);

        if (!item) {
            throw new NotFoundError(
                "Cart item not found."
            );
        }

        // Remove coupon from cart item
        item.couponId = null;

        await cart.save();
    }


    // ─────────────────────────────────────
    // CUSTOM → GiftCart
    // ─────────────────────────────────────

    else if (itemType === "CUSTOM") {

        const giftCart = await Giftcart.findOne({
            userId,
            "items._id": itemId
        });

        if (!giftCart) {
            throw new NotFoundError(
                "Gift cart item not found."
            );
        }

        const item = giftCart.items.id(itemId);

        if (!item) {
            throw new NotFoundError(
                "Gift cart item not found."
            );
        }

        // Remove coupon from gift cart item
        item.couponId = null;

        await giftCart.save();
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
        message: `Coupon "${couponUsage.couponCode}" removed successfully`,
    });
});

module.exports = { applyCoupon, getAvailableCoupon, removeCouponByUser }


