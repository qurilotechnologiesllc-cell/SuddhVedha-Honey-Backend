const mongoose = require('mongoose')

const ourOfficeLocationSchema = new mongoose.Schema({

    // Call Us
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [
            /^[6-9][0-9]{9}$/,
            'Please provide a valid 10 digit mobile number'
        ]
        // "9876543210"
    },

    phone_timing: {
        type: String,
        trim: true,
        default: 'Mon - Sat: 9AM - 6PM'
    },

    // Email Us
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            'Please provide a valid email address'
        ]
        // "hello@shuddhaveda.com"
    },

    email_reply_time: {
        type: String,
        trim: true,
        default: 'We reply within 24 hrs'
    },

    // WhatsApp Us
    whatsapp: {
        type: String,
        required: [true, 'WhatsApp number is required'],
        trim: true,
        match: [
            /^[6-9][0-9]{9}$/,
            'Please provide a valid 10 digit WhatsApp number'
        ]
    },

    whatsapp_timing: {
        type: String,
        trim: true,
        default: 'Mon - Sat: 9AM - 6PM'
    },

    // Visit Our Studio — Full Address
    address: {
        line1: {
            type: String,
            required: [true, 'Address line 1 is required'],
            trim: true
            // "123, Green Hive Road"
        },
        line2: {
            type: String,
            trim: true
            // "Whitefield" (optional)
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true
            // "Bengaluru"
        },
        state: {
            type: String,
            required: [true, 'State is required'],
            trim: true
            // "Karnataka"
        },
        pincode: {
            type: String,
            required: [true, 'Pincode is required'],
            trim: true,
            match: [
                /^[1-9][0-9]{5}$/,
                'Please provide a valid 6 digit pincode'
            ]
            // "560066"
        },
        country: {
            type: String,
            trim: true,
            default: 'India'
        }
    },

    // Google Map Embedded URL
    map_embed_url: {
        type: String,
        required: [true, 'Google map embedded URL is required'],
        trim: true
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true })

module.exports = mongoose.model('OurOfficeLocation', ourOfficeLocationSchema)