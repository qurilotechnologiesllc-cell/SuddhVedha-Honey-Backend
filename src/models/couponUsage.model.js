const mongoose = require("mongoose");

const couponUsageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        offerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Offer",
            required: true,
        },

        couponCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },

        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null
        },

        usedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// One user can use one coupon only once
couponUsageSchema.index(
    { userId: 1, couponCode: 1 },
    { unique: true }
);

module.exports = mongoose.model("CouponUsage", couponUsageSchema);