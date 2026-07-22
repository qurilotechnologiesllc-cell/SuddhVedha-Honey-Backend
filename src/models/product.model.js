const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
    {
        product_name: {
            type: String,
            required: true,
            trim: true
        },

        brand: {
            type: String,
            default: "SudhVeda Honey",
            trim: true
        },

        product_type: {
            type: String,
            required: true,
            enum: ["honey", "gift-box"]
        },

        floral_source: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        key_benefits: {
            type: String,
            required: true,
            trim: true
        },

        ingredients: {
            type: String,
            required: true,
            trim: true
        },

        manufacturer_information: {
            type: String,
            required: true,
            trim: true
        },

        shelf_life: {
            type: String,
            required: true,
            trim: true
        },

        storage_instructions: {
            type: String,
            required: true,
            trim: true
        },

        country_of_origin: {
            type: String,
            required: true,
            trim: true
        },

        fssai_license_number: {
            type: String,
            required: true,
            trim: true
        },

        batch_number: {
            type: String,
            unique: true,
            index: true,
            trim: true
        },

        total_reviews: {
            type: Number,
            default: 0
        },

        average_rating: {
            type: Number,
            default: 0
        },

        // Existing references — unchanged

        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category"
        },

        imageDocumentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductImage"
        },

        videoDocumentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductVideo"
        },

        variantDocumentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductVariant"
        },

        reviews: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ProductReview"
            }
        ],

        is_active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Product", ProductSchema);