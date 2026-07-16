const { Schema, model } = require("mongoose");

const giftCartSchema = new Schema({

    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    items: [

        {

            giftBoxId: {
                type: Schema.Types.ObjectId,
                ref: "GiftBox",
                required: true
            },

            giftWrapId: {
                type: Schema.Types.ObjectId,
                ref: "GiftWrap",
                default: null
            },

            customMessage: {
                type: String,
                default: ""
            },

            quantity: {
                type: Number,
                default: 1,
                required: true
            },

            products: [

                {

                    _id: false,

                    productId: {
                        type: Schema.Types.ObjectId,
                        ref: "Product",
                        required: true
                    },

                    selectedWeight: {
                        type: Schema.Types.ObjectId,
                        required: true
                    }

                }

            ]

        }

    ]

}, {
    timestamps: true
});

module.exports = model("GiftCart", giftCartSchema);