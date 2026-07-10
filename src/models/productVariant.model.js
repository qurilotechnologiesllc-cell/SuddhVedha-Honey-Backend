const mongoose = require("mongoose");

const VariantItemSchema = new mongoose.Schema({

    quantity: {
        type: String,
        enum: [
            "100g",
            "250g",
            "500g",
            "1kg",
            "2kg"
        ],
        required: true
    },

    sku: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true,
        index: true        // optional
    },

    mrp: {
        type: Number,
        required: true
    },

    discount: {
        type: Number,
        default: 0
    }

}, { _id: false });

const ProductVariantSchema = new mongoose.Schema({

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        unique: true,
        required: true
    },

    variants: [VariantItemSchema]

}, {
    timestamps: true
});

module.exports = mongoose.model(
    "ProductVariant",
    ProductVariantSchema
);