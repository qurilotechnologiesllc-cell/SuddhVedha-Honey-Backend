const { Schema, model } = require('mongoose')

const influencerSchema = new Schema(
    {
        // Basic influencer details
        name: {
            type: String,
            required: true,
            trim: true,
        },

        phoneNumber: {
            type: String,
            required: true,
            trim: true,
            match: [
                /^[0-9]{10}$/,
                'Phone number must contain exactly 10 digits',
            ],
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: [
                50,
                'Email cannot exceed 50 characters',
            ],
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                'Please provide a valid email address',
            ],
        },

        username: {
            type: String,
            required: true,
            trim: true,
        },

        // Social media reach
        numberOfFollowers: {
            type: Number,
            required: true,
            min: 0,
        },

        // Address details
        fullAddress: {
            type: String,
            required: true,
            trim: true,
        },

        city: {
            type: String,
            required: true,
            trim: true,
        },

        pinCode: {
            type: String,
            required: true,
            trim: true,
        },

        // Influencer category / niche
        influencerGeneric: {
            type: String,
            required: true,
            trim: true,
        },

        // Whether admin has read the influencer details
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
)

module.exports = model('Influencer', influencerSchema)