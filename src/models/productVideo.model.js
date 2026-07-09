const mongoose = require("mongoose");

const VideoSchema = new mongoose.Schema(
    {
        public_id: {
            type: String,
            required: true,
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
        _id: true
    }
);

const ProductVideoSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            unique: true,
            index: true
        },

        videos: [VideoSchema]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "ProductVideo",
    ProductVideoSchema
);