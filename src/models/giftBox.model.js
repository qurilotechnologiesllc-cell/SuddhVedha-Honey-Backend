const mongoose = require('mongoose')

const giftBoxSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Gift box name is required.'],
            trim: true
            // "Honey Duo Box", "Honey Trio Box", "Honey Quad Box"
        },

        description: {
            type: String,
            trim: true,
            default: ''
        },

        image: {
            type: String,
            required: [true, 'Gift box image is required.']
        },

        public_id: {
            type: String,
            required: [true, 'Image public id is required.']
        },

        price: {
            type: Number,
            required: [true, 'Gift box price is required.'],
            min: [0, 'Price cannot be negative.']
        },

        // ✅ Naya Field — Kitne Jars aayenge box mein
        jar_count: {
            type: Number,
            required: [true, 'Jar count is required.'],
            enum: {
                values: [2, 3, 4],
                message: 'Jar count must be 2, 3, or 4'
            }
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
)

module.exports = mongoose.model('GiftBox', giftBoxSchema)