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

            quantity: {
                type: Number,
                default: 1,
                required: true
            },

            // Coupon applied on this custom gift item
            couponId: {
                type: Schema.Types.ObjectId,
                ref: "Coupon",
                default: null
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