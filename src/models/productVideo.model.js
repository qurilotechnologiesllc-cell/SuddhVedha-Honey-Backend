const mongoose = require('mongoose');

const ProductVideoSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true
        },

        public_id: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        duration: {
            type: Number,
            required: true,
            min: 0
        },

        format: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('ProductVideo', ProductVideoSchema);