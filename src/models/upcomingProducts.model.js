const mongoose = require('mongoose')

const upcomingProductSchema = new mongoose.Schema({

    // Basic Info
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },

    subtitle: {
        type: String,
        trim: true,
        default: 'Something sweet is on the way'
    },

    tag: {
        type: String,
        trim: true,
        default: 'COMING SOON'
        // "New Arrival", "Coming Soon"
    },

    product_name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },

    product_description: {
        type: String,
        trim: true
    },

    // Features list — Checkboxes
    features: [
        {
            type: String,
            trim: true
            // ["Boosts Immunity", "Rich in Antioxidants", "100% Raw & Natural"]
        }
    ],

    // Banner Image — Left side
    banner_image: {
        type: String,
        required: [true, 'Banner image is required']
    },

    public_id: {
        type: String
    },

    // ✅ Launch Date — Countdown ke liye
    // Yahi sabse important hai!
    launch_date: {
        type: Date,
        required: [true, 'Launch date is required']
        // "2026-08-01T10:00:00.000Z"
        // Isi se countdown calculate hoga!
    },

    // Pre Order Link
    pre_order_url: {
        type: String,
        trim: true,
        default: '#'
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true })

module.exports = mongoose.model('UpcomingProduct', upcomingProductSchema)