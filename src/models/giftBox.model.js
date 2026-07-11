const mongoose = require('mongoose')

const giftBoxSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Gift box name is required."],
            trim: true,
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        image: {
            type: String,
            required: [true, "Gift box image is required."],
        },

        public_id:{
            type: String,
            required: [true, "Image public id is required."],
        },

        price: {
            type: Number,
            required: [true, "Gift box price is required."],
            min: [0, "Price cannot be negative."],
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        sortOrder: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = new mongoose.model("GiftBox", giftBoxSchema);