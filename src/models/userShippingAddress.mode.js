const { Schema, model } = require('mongoose')

const mongoose = require('mongoose')

const UserShippingAddressesSchema = new Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    full_name: {
        type: String,
        required: true,
        trim: true
    },

    phone_number: {
        type: String,
        required: true,
        trim: true,
        match: [
            /^[6-9][0-9]{9}$/,
            'Please provide a valid 10 digit phone number'
        ]
    },

    address_line1: {
        type: String,
        required: true,
        trim: true
    },

    address_line2: {
        type: String,
        trim: true
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
    },

    country: {
        type: String,
        default: 'India',
        trim: true
    },

    address_type: {
        type: String,
        enum: ['home', 'work', 'other'],
        default: 'home'
    },

    is_default: {
        type: Boolean,
        default: false
    }
},
    { timestamps: true }
)

module.exports = model('UserShippingAddresses', UserShippingAddressesSchema)

