const mongoose = require("mongoose");

const ComboImageSchema = new mongoose.Schema(
    {
        comboProductId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ComboProduct",
            required: true,
            unique: true
        },

        images: [
            {
                url: {
                    type: String,
                    required: true
                },

                public_id: {
                    type: String
                },

                is_primary: {
                    type: Boolean,
                    default: false
                },

                sort_order: {
                    type: Number,
                    default: 0
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('ComboProductImage', ComboImageSchema)