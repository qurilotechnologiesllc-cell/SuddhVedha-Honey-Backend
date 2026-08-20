const mongoose = require('mongoose')

const orderGroupSchema = new mongoose.Schema({

    group_id: {
        type: String,
        required: true,
        unique: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    orderIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
    }],

    totalAmount: {
        type: Number,
        required: true
    },

    finalAmount: {
        type: Number,
        required: true
    },

    coupon: {

        offerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Offer",
            default: null
        },

        couponCode: {
            type: String,
            default: null,
            uppercase: true,
            trim: true
        },

        discountType: {
            type: String,
            enum: [
                "PERCENTAGE",
                "FLAT"
            ],
            default: null
        },

        discountValue: {
            type: Number,
            default: 0
        },

        discountAmount: {
            type: Number,
            default: 0
        }

    },

    payment_mode: {
        type: String,
        enum: [
            "upi",
            "card",
            "net_banking",
            "wallet",
            "cod"
        ],
        required: true
    },

    payment_status: {
        type: String,
        enum: [
            "pending",
            "processing",
            "paid",
            "failed",
            "cancelled",
            "refunded",
            "partially_refunded"
        ],
        default: "pending"
    },

    payment: {

        razorpay_order_id: String,

        razorpay_payment_id: String,

        method: String,

        amount: Number,

        currency: String,

        status: String,

        captured: Boolean,

        fee: Number,

        tax: Number,

        vpa: String,

        bank: String,

        wallet: String,

        acquirer_data: mongoose.Schema.Types.Mixed
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    "OrderGroup",
    orderGroupSchema
);