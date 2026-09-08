const mongoose = require('mongoose')

const velocityOrderSchema = new mongoose.Schema(
    {
        // Your internal references
        orderGroupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OrderGroup",
            required: true,
            index: true,
        },

        orderIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Order",
            },
        ],

        // Your internal order ID, e.g. SV - 20260822 -7C1A1FA0
        merchantOrderId: {
            type: String,
            required: true,
            index: true,
        },

        // Velocity response identifiers
        velocityOrderId: {
            type: String,
            default: null,
            index: true,
        },

        shipmentId: {
            type: String,
            default: null,
            index: true,
        },

        awbCode: {
            type: String,
            default: null,
            index: true,
        },

        courierCompanyId: {
            type: String,
            default: null,
        },

        courierName: {
            type: String,
            default: null,
        },

        labelUrl: {
            type: String,
            default: null,
        },

        manifestUrl: {
            type: String,
            default: null,
        },

        pickupTokenNumber: {
            type: String,
            default: null,
        },

        // Complete response received from Velocity
        rawResponse: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },

        // Useful for our own integration state
        status: {
            type: String,
            enum: [
                "PENDING",
                "SUCCESS",
                "FAILED",
            ],
            default: "PENDING",
            index: true,
        },

        error: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "VelocityOrder",
    velocityOrderSchema
);