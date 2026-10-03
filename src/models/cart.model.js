const { Schema, model } = require("mongoose");

const cartItemSchema = new Schema(
    {
        type: {
            type: String,
            enum: ["NORMAL", "COMBO"],
            required: true
        },

        // =========================
        // NORMAL PRODUCT
        // =========================

        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product"
        },

        selectedWeight: {
            type: Schema.Types.ObjectId,
            ref: "ProductVariant"
        },


        // =========================
        // COMBO PRODUCT
        // =========================

        comboProductId: {
            type: Schema.Types.ObjectId,
            ref: "ComboProduct"
        },

        message: {
            type: String,
            trim: true,
            default: ""
        },

        // =========================
        // COMMON
        // =========================

        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        }
    },
    {
        _id: true
    }
);


const cartSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        items: [cartItemSchema]
    },
    {
        timestamps: true
    }
);


module.exports = model("Cart", cartSchema);