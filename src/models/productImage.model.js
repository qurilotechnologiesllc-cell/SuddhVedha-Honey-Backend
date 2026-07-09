const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema(
    {
        public_id: {
            type: String,
            required: true,
            trim: true
        },

        image_url: {
            type: String,
            required: true,
            trim: true
        },

        is_primary: {
            type: Boolean,
            default: false
        }
    },
    {
        _id: true
    }
);

const ProductImageSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            unique: true,
            index: true
        },

        images: [ImageSchema]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("ProductImage", ProductImageSchema);