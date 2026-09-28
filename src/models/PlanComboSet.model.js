const { Schema, model } = require("mongoose");

const comboSetItemSchema = new Schema(
    {
        monthName: {
            type: String,
            required: true,
            trim: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        image: {
            type: String,
            required: true,
            trim: true
        },

        public_id: {
            type: String,
            required: true,
            trim: true
        },

        products: [
            {
                _id: false,

                name: {
                    type: String,
                    required: true,
                    trim: true
                },

                weight: {
                    type: Number,
                    required: true,
                    enum: [500]
                },

                unit: {
                    type: String,
                    required: true,
                    enum: ["g"]
                }
            }
        ],

        // Harvest information
        season: {
            type: String,
            required: true,
            trim: true
        },

        harvestTitle: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        readMore: {
            type: String,
            required: true,
            trim: true
        }
    },
);


const planComboSetSchema = new Schema(
    {
        planId: {
            type: Schema.Types.ObjectId,
            ref: "Plans",
            required: true,
            unique: true,
            index: true
        },

        combosets: {
            type: [comboSetItemSchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);


module.exports = model(
    "PlanComboSet",
    planComboSetSchema
);