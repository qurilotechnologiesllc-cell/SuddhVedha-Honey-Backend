const { Schema , model} = require('mongoose');
const mongoose = require('mongoose');

const cartSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
        },
    ],
}, { timestamps: true });

const Cart = model('Cart', cartSchema);

module.exports = Cart;