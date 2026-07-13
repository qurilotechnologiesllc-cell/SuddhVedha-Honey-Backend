const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
    {
        couponCode: {
            type: String,
            required: [true, "Coupon code is required"],
            unique: true,
            uppercase: true,
            trim: true,
        },

        minimumOrderAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        discountType: {
            type: String,
            enum: ["FREE_SHIPPING", "PERCENTAGE", "FLAT"],
            required: true,
        },

        discountValue: {
            type: Number,
            required: true,
            min: 0,
        },

        // Only for percentage discount
        maximumDiscount: {
            type: Number,
            default: null,
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

offerSchema.pre("save", function (next) {
    if (this.discountType === "PERCENTAGE") {
        if (this.discountValue < 1 || this.discountValue > 100) {
            return next(
                new Error("Percentage discount must be between 1 and 100")
            );
        }
    }

    if (this.discountType === "FREE_SHIPPING") {
        this.discountValue = 0;
    }
    next
});

module.exports = mongoose.model("Offers", offerSchema);