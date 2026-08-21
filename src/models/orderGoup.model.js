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

    cod_amount: {
        type: Number,
        default: 0
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
            'upi',
            'card',
            'netbanking',
            'wallet',
            'emi',
            'cod'
        ],
        required: true
    },

    payment_status: {
        type: String,
        enum: [
            'pending',
            'created',
            'authorized',
            'captured',
            'failed',
            'refunded',
            'partially_refunded',
            'cancelled'
        ],
        default: 'pending',
        index: true
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