const { Schema, model } = require("mongoose");

const ComboCartSchema = new Schema({

    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    items: [

        {

            setPackId: {
                type: Schema.Types.ObjectId,
                ref: "ComboPack",
                required: true
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

module.exports = model("ComboCart", ComboCartSchema);