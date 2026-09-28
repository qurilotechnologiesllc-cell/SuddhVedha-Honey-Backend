const { Schema, model } = require('mongoose')

const plansSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        image_url: {
            type: String,
            required: true,
            trim: true
        },

        public_id: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        idealFor: {
            type: String,
            required: true,
            trim: true
        },

        durationMonths: {
            type: Number,
            required: true,
            min: 1
        },

        // One plan -> one PlanComboSet document
        comboSetId: {
            type: Schema.Types.ObjectId,
            ref: "PlanComboSet",
            default: null
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        originalPrice: {
            type: Number,
            required: true,
            min: 0
        },

        discountPercentage: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },

        currency: {
            type: String,
            default: "INR",
            trim: true
        },

        badge: {
            type: String,
            trim: true,
            default: null
        },

        isPopular: {
            type: Boolean,
            default: false
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = model('Plans', plansSchema)