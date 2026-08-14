const mongoose = require('mongoose')

// ─── Normal Product Item ──────────────────────────
const normalItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    product_name: { type: String },
    brand: { type: String },
    image_url: { type: String },

    // Selected Variant Info
    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    weight: { type: Number },
    unit: { type: String },
    sku: { type: String },
    price: { type: Number },
    mrp: { type: Number },
    you_save: { type: Number },

    quantity: { type: Number, default: 1 }
}, { _id: false })

// ─── Gift Box Product Item ────────────────────────
const giftProductSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    product_name: { type: String },
    brand: { type: String },
    image_url: { type: String },

    variantId: { type: mongoose.Schema.Types.ObjectId },
    weight: { type: Number },
    unit: { type: String },
    price: { type: Number },
    mrp: { type: Number },
    you_save: { type: Number }
}, { _id: false })

// ─── Gift Box Item ────────────────────────────────
const giftItemSchema = new mongoose.Schema({
    giftBoxId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GiftBox',
        required: true
    },
    box_name: { type: String },
    box_image_url: { type: String },
    box_price: { type: Number },

    products: [giftProductSchema],

    quantity: { type: Number, default: 1 },
    total_weight: { type: Number },
    total_amount: { type: Number },
    total_save: { type: Number }
}, { _id: false })

// ─── Main Order Schema ────────────────────────────
const orderSchema = new mongoose.Schema({

    // ── Order ID ──────────────────────────────────
    order_id: {
        type: String,
        required: true,
        unique: true
        // "SV10254", "SV10255"
    },

    // ── User ──────────────────────────────────────
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    customer_name: { type: String },
    customer_email: { type: String },
    customer_phone: { type: String },

    // ── Order Items ───────────────────────────────
    // Normal products
    normal_items: [normalItemSchema],

    // Custom gift box items
    gift_items: [giftItemSchema],

    // ── Shipping Address ──────────────────────────
    shipping_address: {
        full_name: { type: String },
        phone: { type: String },
        address_line1: { type: String },
        address_line2: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        country: { type: String, default: 'India' }
    },

    // ── Price Breakdown ───────────────────────────
    sub_total: { type: Number, default: 0 },
    shipping_charges: { type: Number, default: 0 },
    gift_wrap_charges: { type: Number, default: 0 },
    total_discount: { type: Number, default: 0 },
    coupon_discount: { type: Number, default: 0 },
    final_amount: { type: Number, required: true },

    // ── Coupon ────────────────────────────────────
    coupon_code: { type: String, default: null },
    coupon_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',
        default: null
    },

    // ── Payment ───────────────────────────────────
    payment_method: {
        type: String,
        enum: ['upi', 'card', 'net_banking', 'wallet', 'cod'],
        required: true
    },
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    razorpay_order_id: { type: String, default: null },
    razorpay_payment_id: { type: String, default: null },

    // ── Order Status ──────────────────────────────
    order_status: {
        type: String,
        enum: [
            'processing',
            'packed',
            'shipped',
            'delivered',
            'cancelled',
            'returned',
            'refunded'
        ],
        default: 'processing'
    },

    // ── Shiprocket ────────────────────────────────
    shiprocket_order_id: { type: String, default: null },
    shiprocket_shipment_id: { type: String, default: null },
    awb_code: { type: String, default: null },
    courier_name: { type: String, default: null },
    tracking_url: { type: String, default: null },

    // ── Notes ─────────────────────────────────────
    customer_note: { type: String, default: '' },
    admin_note: { type: String, default: '' }

}, { timestamps: true })

module.exports = mongoose.model('Order', orderSchema)