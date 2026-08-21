const mongoose = require('mongoose')


// ─────────────────────────────────────────────
// Order Item
// ─────────────────────────────────────────────

const orderItemSchema = new mongoose.Schema({

    type: {
        type: String,
        enum: ['NORMAL', 'CUSTOM'],
        required: true
    },

    product_details: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },

    quantity: {
        type: Number,
        required: true,
        min: 1
    },

    /*
    |--------------------------------------------------------------------------
    | Inventory reservation
    |--------------------------------------------------------------------------
    */

    reserved_quantity: {
        type: Number,
        required: true,
        min: 0
    }

}, { _id: true })


// ─────────────────────────────────────────────
// Main Order Schema
// ─────────────────────────────────────────────

const orderSchema = new mongoose.Schema({

    // ─────────────────────────────────────────
    // Order ID
    // ─────────────────────────────────────────

    order_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },


    // ─────────────────────────────────────────
    // User
    // ─────────────────────────────────────────

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    order_group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrderGroup",
        required: true
    },


    // ─────────────────────────────────────────
    // Order Items
    // ─────────────────────────────────────────

    items: {
        type: [orderItemSchema],
        required: true
    },


    // ─────────────────────────────────────────
    // Final Amount
    // ─────────────────────────────────────────

    totalAmount: {
        type: Number,
        required: true
    },


    // ─────────────────────────────────────────
    // Shipping Address
    // ─────────────────────────────────────────

    shipping_address: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },


    // ─────────────────────────────────────────
    // Billing Address
    // ─────────────────────────────────────────

    billing_address: {
        type: mongoose.Schema.Types.Mixed,
        required: true
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


    // ─────────────────────────────────────────
    // Payment Status
    // ─────────────────────────────────────────

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

    // ─────────────────────────────────────────
    // Payment Details
    // ─────────────────────────────────────────

    payment: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },


    // ─────────────────────────────────────────
    // Order Status
    // ─────────────────────────────────────────

    order_status: {
        type: String,
        enum: [
            'pending',
            'processing',
            'packed',
            'shipped',
            'delivered',
            'cancelled',
            'returned',
            'refunded'
        ],
        default: 'pending',
        index: true
    },


    // ─────────────────────────────────────────
    // Inventory Status
    // ─────────────────────────────────────────

    inventory_status: {
        type: String,
        enum: [
            'pending',
            'reserved',
            'released',
            'consumed'
        ],
        default: 'pending'
    },


    // ─────────────────────────────────────────
    // Shiprocket
    // ─────────────────────────────────────────

    shipment: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },


    // ─────────────────────────────────────────
    // Optional Notes
    // ─────────────────────────────────────────

    customer_note: {
        type: String,
        default: ''
    },

    admin_note: {
        type: String,
        default: ''
    }

}, {
    timestamps: true
})


module.exports = mongoose.model('Order', orderSchema)