const mongoose = require('mongoose')

const giftWrapSchema = new mongoose.Schema(
    {
        color: {
            type: String,
            required: [true, "Gift wrap color is required."],
            trim: true,
        },

        description: {
            type: String,
            default: "",
            trim: true,
        },

        price: {
            type: Number,
            required: [true, "Gift wrap price is required."],
            min: [0, "Price cannot be negative."],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = new mongoose.model("GiftWrap", giftWrapSchema);
