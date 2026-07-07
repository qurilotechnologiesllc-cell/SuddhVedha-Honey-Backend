const mongoose = require("mongoose");

const ProductVariantSchema = new mongoose.Schema({

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },

    quantity: {
        type: String,
        enum: [
            "250g",
            "500g",
            "1kg",
            "2kg"
        ]
    },

    sku: {
        type: String,
        unique: true
    },

    price: {
        type: Number,
        required: true
    },

    mrp: {
        type: Number,
        required: true
    },

    discount: {
        type: Number,
        default: 0
    }

},
    {
        timestamps: true
    });

module.exports = mongoose.model("ProductVariant", ProductVariantSchema);