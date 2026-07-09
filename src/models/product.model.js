const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
    {
        product_name: {
            type: String,
            required: true,
            trim: true
        },

        slug: {
            type: String,
            unique: true,
            index: true
        },

        brand: {
            type: String,
            default: "SudhVeda Honey"
        },

        flavor: {
            type: String,
            required: true
        },

        description: {
            type: String,
            required: true
        },

        manufacturer_information: {
            type: String,
            required: true
        },

        average_rating: {
            type: Number,
            default: 0
        },

        total_reviews: {
            type: Number,
            default: 0
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
        },

        images: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductImage"
        }],

        videos: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductVideo"
        }],

        variants: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductVariant"
        }],

        reviews: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductReview"
        }],

        is_active: {
            type: Boolean,
            default: true
        }

    },
    {
        timestamps: true
    });

module.exports = mongoose.model("Product", ProductSchema);