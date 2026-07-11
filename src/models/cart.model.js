const { Schema, model } = require('mongoose')
const mongoose = require('mongoose')

const cartSchema = new Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: [true, 'Product is required']
            },

            // ✅ Variant add kiya
            selectedWeight: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'ProductVariant',
                required: [true, 'Variant is required']
            },

            quantity: {
                type: Number,
                required: [true, 'Quantity is required'],
                min: [1, 'Quantity cannot be less than 1'],
                default: 1
            }
        }
    ]

}, { timestamps: true })

module.exports = model('Cart', cartSchema)