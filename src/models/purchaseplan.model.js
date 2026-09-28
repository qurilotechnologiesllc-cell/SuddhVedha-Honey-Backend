const mongoose = require("mongoose");

const planDeliverySchema = new mongoose.Schema(
    {
        
        // ─────────────────────────────────────
        // Combo Set Reference
        // ─────────────────────────────────────

        comboSetId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        // ─────────────────────────────────────
        // Delivery / Combo Basic Details
        // Snapshot from PlanComboSet
        // ─────────────────────────────────────

        monthName: {
            type: String,
            required: true,
            trim: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        image: {
            type: String,
            default: ""
        },

        season: {
            type: String,
            default: "",
            trim: true
        },

        harvestTitle: {
            type: String,
            default: "",
            trim: true
        },

        description: {
            type: String,
            default: "",
            trim: true
        },

        readMore: {
            type: String,
            default: "",
            trim: true
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
                "returned",
                "confirmed"
            ],
            default: "pending"
        },

        // ─────────────────────────────────────
        // Scheduled Date
        // ─────────────────────────────────────

        scheduledDate: {
            type: Date,
            default: null
        }
    },
    {
        _id: true,
        timestamps: true
    }
);

const purchasePlanSchema = new mongoose.Schema(
    {
        purchase_id: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plans",
            required: true,
            index: true
        },

        // ─────────────────────────────────────
        // Purchased Plan Snapshot
        // ─────────────────────────────────────

        plan: {

            name: {
                type: String,
                required: true,
                trim: true
            },

            description: {
                type: String,
                default: ""
            },

            idealFor: {
                type: String,
                default: ""
            },

            durationMonths: {
                type: Number,
                required: true
            },

            price: {
                type: Number,
                required: true
            },

            originalPrice: {
                type: Number,
                required: true
            },

            discountPercentage: {
                type: Number,
                default: 0
            },

            currency: {
                type: String,
                default: "INR"
            }
        },

        // ─────────────────────────────────────
        // Customer
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

        shipping_address: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },

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