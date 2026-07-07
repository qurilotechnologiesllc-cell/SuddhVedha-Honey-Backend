const { Schema, model } = require('mongoose')
const mongoose = require('mongoose')

const userAddressSchema = new Schema({

    // User Reference
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true  // Fast lookup ke liye
    },

    // Receiver Info
    full_name: {
        type: String,
        required: true,
        trim: true
    },

    phone: {
        type: String,
        required: true,
        trim: true
    },

    // Address Details
    address_line1: {
        type: String,
        required: true,
        trim: true
        // Example: "123, Shiv Nagar, Near Bus Stand"
    },

    address_line2: {
        type: String,
        trim: true
        // Example: "Opp. SBI Bank" (optional)
    },

    city: {
        type: String,
        required: true,
        trim: true
    },

    state: {
        type: String,
        required: true,
        trim: true
    },

    pincode: {
        type: String,
        required: true,
        trim: true,
        match: [/^[1-9][0-9]{5}$/, 'Invalid pincode']
        // 6 digit Indian pincode
    },

    country: {
        type: String,
        default: 'India',
        trim: true
    },

    // Address Type
    address_type: {
        type: String,
        enum: ['home', 'work', 'other'],
        default: 'home'
    },

    is_default: {
        type: Boolean,
        default: false
    }

}, { timestamps: true })

module.exports = model('UserAddress', userAddressSchema)