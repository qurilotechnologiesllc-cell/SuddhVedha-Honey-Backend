const { Schema, model } = require("mongoose");

const addressSchema = new Schema(
    {
        full_name: String,
        phone: String,
        address_line1: String,
        address_line2: String,
        city: String,
        state: String,
        pincode: String,
        country: String,
    },
    { _id: false }
);

const reversePickupItemSchema = new Schema(
    {
        productId: String,
        productName: {
            type: String,
            required: true,
        },
        sku: String,
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        sellingPrice: Number,
        imageUrl: String,
    },
    { _id: false }
);

const reversePickupSchema = new Schema(
    {
        // References to existing documents
        returnRequestId: {
            type: Schema.Types.ObjectId,
            ref: "ReturnRequest",
            required: true,
            unique: true,
            index: true,
        },

        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true,
        },

        orderGroupId: {
            type: Schema.Types.ObjectId,
            ref: "OrderGroup",
            required: true,
            index: true,
        },

        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Your business-generated return ID
        return_id: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // Customer pickup and warehouse destination snapshots
        pickupAddress: {
            type: addressSchema,
            required: true,
        },

        destinationAddress: {
            type: addressSchema,
            required: true,
        },

        // Products being returned
        items: {
            type: [reversePickupItemSchema],
            required: true,
            validate: {
                validator: (items) => items.length > 0,
                message: "At least one return item is required",
            },
        },

        // Shipment package dimensions copied from OrderGroup
        packageDetails: {
            length: Number,
            breadth: Number,
            height: Number,
            weight: Number,
        },

        paymentMode: {
            type: String,
            enum: ["PREPAID"],
            default: "PREPAID",
        },

        requestPickup: {
            type: Boolean,
            default: true,
        },

        // Velocity shipment information
        velocity: {
            velocityOrderId: String,
            shipmentId: String,
            awbCode: String,
            courierCompanyId: String,
            courierName: String,
            labelUrl: String,
            pickupTokenNumber: String,
            appliedWeight: Number,
            charges: {
                reverseCharges: String,
                qc: String,
                qcLeeway: String,
            },
        },

        status: {
            type: String,
            enum: [
                "pending",
                "creating",
                "pickup_created",
                "pickup_failed",
                "pickup_in_transit",
                "delivered_to_warehouse",
                "qc_pending",
                "qc_passed",
                "qc_failed",
                "completed",
                "cancelled",
            ],
            default: "pending",
            index: true,
        },

        // Keep the API request and response for troubleshooting
        requestPayload: {
            type: Schema.Types.Mixed,
            default: null,
        },

        rawResponse: {
            type: Schema.Types.Mixed,
            default: null,
        },

        error: {
            type: String,
            default: null,
        },

        trackingHistory: {
            type: [Schema.Types.Mixed],
            default: [],
        },
    },
    { timestamps: true }
);

module.exports = model("ReversePickup", reversePickupSchema);