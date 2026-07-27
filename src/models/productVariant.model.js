const mongoose = require("mongoose");

const VariantItemSchema = new mongoose.Schema({

    mrp: {
        type: Number,
        required: true,
        min: 0
    },

    price: {
        type: Number,
        required: true,
        min: 0,
        index: true
    },

    discount_type: {
        type: String,
        enum: [
            "percentage",
            "fixed"
        ],
        default: "percentage"
    },

    discount_percentage: {
        type: Number,
        default: 0,
        min: 0
    },

    you_save: {
        type: Number,
        default: 0,
        min: 0
    },

    tax: {
        type: String,
        required: true
    },


    sku: {
        type: String,
        required: true,
        trim: true
    },

    barcode: {
        type: String,
        trim: true,
        default: null
    },

    weight: {
        type: Number,
        required: true,
        min: 0
    },

    unit: {
        type: String,
        required: true,
        enum: [
            "g",
            "kg"
        ]
    },

    available_stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },

    low_stock_alert: {
        type: Number,
        required: true,
        min: 0,
        default: 5
    },

    stock_status: {
        type: String,
        enum: [
            "in_stock",
            "out_of_stock",
            "low_stock"
        ],
        default: "in_stock"
    },

    allow_backorders: {
        type: Boolean,
        default: false
    }

});

const StockHistorySchema = new mongoose.Schema({

    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    previous_stock: {
        type: Number,
        required: true
    },

    updated_stock: {
        type: Number,
        required: true
    },

    weight: {
        type: Number,
        required: true
    },

    updated_at: {
        type: Date,
        default: Date.now
    }

}, {
    _id: false
});


const ProductVariantSchema = new mongoose.Schema({

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        unique: true,
        required: true
    },

    variants: [
        VariantItemSchema
    ],

    stock_history: [
        StockHistorySchema
    ]

}, {
    timestamps: true
});


module.exports = mongoose.model(
    "ProductVariant",
    ProductVariantSchema
);