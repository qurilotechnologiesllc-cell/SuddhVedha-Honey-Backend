const mongoose = require("mongoose");

const planDeliverySchema = new mongoose.Schema(
    {

        // ─────────────────────────────────────
        // Delivery Number
        // ─────────────────────────────────────

        deliveryNumber: {
            type: Number,
            required: true
        },


        // ─────────────────────────────────────
        // Generated Order
        // ─────────────────────────────────────

        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null
        },


        // ─────────────────────────────────────
        // Product sent in this delivery
        // ─────────────────────────────────────

        product: {

            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },

            variantId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },

            productName: {
                type: String,
                required: true
            },

            quantity: {
                type: Number,
                required: true,
                min: 1
            },

            quantityPerJar: {
                type: Number
            },

            quantityUnit: {
                type: String
            }

        },


        // ─────────────────────────────────────
        // Delivery Status
        // ─────────────────────────────────────

        status: {
            type: String,
            enum: [
                "pending",
                "processing",
                "packed",
                "shipped",
                "delivered",
                "cancelled",
                "returned"
            ],
            default: "pending"
        },


        // ─────────────────────────────────────
        // Dates
        // ─────────────────────────────────────

        scheduledDate: {
            type: Date,
            default: null
        },

        shippedAt: {
            type: Date,
            default: null
        },

        deliveredAt: {
            type: Date,
            default: null
        },


        // ─────────────────────────────────────
        // Shipment / Tracking
        // ─────────────────────────────────────

        tracking: {

            courierName: {
                type: String,
                default: ""
            },

            trackingNumber: {
                type: String,
                default: ""
            },

            trackingUrl: {
                type: String,
                default: ""
            }

        }

    },
    {
        _id: true,
        timestamps: true
    }
);

const purchasePlanSchema = new mongoose.Schema(
    {

        // ─────────────────────────────────────
        // Purchase ID
        // ─────────────────────────────────────

        purchase_id: {
            type: String,
            required: true,
            unique: true,
            index: true
        },


        // ─────────────────────────────────────
        // User
        // ─────────────────────────────────────

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },


        // ─────────────────────────────────────
        // Plan
        // ─────────────────────────────────────

        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
            required: true,
            index: true
        },


        // ─────────────────────────────────────
        // Plan Snapshot
        // ─────────────────────────────────────

        plan: {

            name: {
                type: String,
                required: true
            },

            plan_image: {
                type: String,
                default: ""
            },

            packageLabel: String,

            quantityPerJar: Number,

            quantityUnit: String,

            numberOfJars: Number,

            totalQuantity: Number,

            totalQuantityUnit: String,

            durationMonths: Number,

            jarsPerDelivery: Number,

            price: Number,

            originalPrice: Number,

            currency: {
                type: String,
                default: "INR"
            }

        },


        // ─────────────────────────────────────
        // Customer Details
        // ─────────────────────────────────────

        customer: {

            name: {
                type: String,
                required: true
            },

            mobile: {
                type: String,
                required: true
            },

            email: {
                type: String,
                default: ""
            }

        },


        // ─────────────────────────────────────
        // Shipping Address
        // ─────────────────────────────────────

        shipping_address: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },


        // ─────────────────────────────────────
        // Billing Address
        // ─────────────────────────────────────

        billing_address: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },


        finalAmount: {
            type: Number,
            required: true
        },

        currency: {
            type: String,
            default: "INR"
        },


        // ─────────────────────────────────────
        // Payment
        // ─────────────────────────────────────

        payment_status: {
            type: String,
            enum: [
                "pending",
                "created",
                "authorized",
                "captured",
                "failed",
                "refunded",
                "partially_refunded",
                "cancelled"
            ],
            default: "pending",
            index: true
        },

        payment_mode: {
            type: String,
            enum: [
                "upi",
                "card",
                "netbanking",
                "wallet",
                "emi"
            ]
        },

        payment: {

            razorpay_order_id: {
                type: String,
                index: true
            },

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

            email: String,

            contact: String,

            acquirer_data:
                mongoose.Schema.Types.Mixed,

            raw:
                mongoose.Schema.Types.Mixed
        },


        // ─────────────────────────────────────
        // Plan Lifecycle
        // ─────────────────────────────────────

        status: {
            type: String,
            enum: [
                "pending_payment",
                "active",
                "paused",
                "completed",
                "cancelled",
                "refunded"
            ],
            default: "pending_payment",
            index: true
        },


        // ─────────────────────────────────────
        // Fulfillment
        // ─────────────────────────────────────

        totalDeliveries: {
            type: Number,
            required: true
        },

        completedDeliveries: {
            type: Number,
            default: 0
        },

        currentDeliveryNumber: {
            type: Number,
            default: 0
        },

        deliveries: {
            type: [planDeliverySchema],
            default: []
        },

        startDate: {
            type: Date
        },

        endDate: {
            type: Date
        }

        

    },
    {
        timestamps: true
    }
);



// Prevent duplicate active purchase processing if needed
purchasePlanSchema.index({
    userId: 1,
    planId: 1,
    status: 1
});


module.exports = mongoose.model(
    "PurchasePlanDetails",
    purchasePlanSchema
);