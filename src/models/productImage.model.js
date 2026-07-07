const mongoose = require("mongoose");

const ProductImageSchema = new mongoose.Schema({

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true
    },

    image_url: {
        type: String,
        required: true
    },

    public_id: {
        type: String,
        required: true
    },

    display_order: {
        type: Number,
        default: 1
    }

},
    {
        timestamps: true
    });

module.exports = mongoose.model("ProductImage", ProductImageSchema);