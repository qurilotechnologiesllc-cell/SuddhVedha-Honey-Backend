const mongoose = require("mongoose");

const ComboPackSchema = new mongoose.Schema(
    {
        comboProductId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ComboProduct",
            required: true,
            index: true
        },

        pack_name: {
            type: String,
            required: true,
            trim: true
        },

        pack_size: {
            type: Number,
            required: true,
            enum: [2, 3, 4]
        },

        // pack_size ke hisab se products (unki productId + selectedWeight)
        products: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true
                },

                selectedWeight: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true
                },

                _id: false
            }
        ],

        mrp: {
            type: Number,
            required: true,
            min: 0
        },

        selling_price: {
            type: Number,
            required: true,
            min: 0
        },

        discount_percent: {
            type: Number,
            default: 0,
            min: 0
        },

        image: {
            type: String,
            default: ""
        },
        
        public_id: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "ComboPack",
    ComboPackSchema
);