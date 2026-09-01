const { Schema, model } = require('mongoose')

const plansSchema = new Schema(
    {
        // Basic plan information
        name: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        // Image shown on the plan card
        image: {
            type: String,
            required: true,
            trim: true,
        },

        public_id: {
            type: String,
            required: true,
            trim: true,
        },

        // Short text displayed above/around the quantity
        packageLabel: {
            type: String,
            required: true,
            trim: true,
            // Example: "250 g × 6 Jars"
        },

        // Quantity of honey in each jar/package
        quantityPerJar: {
            type: Number,
            required: true,
            min: 0,
            // Example: 250, 500, 1000
        },

        quantityUnit: {
            type: String,
            required: true,
            enum: ['g', 'kg'],
            default: 'g',
        },

        // Number of jars included
        numberOfJars: {
            type: Number,
            required: true,
            min: 1,
            // Example: 6
        },

        // Total honey quantity
        totalQuantity: {
            type: Number,
            required: true,
            min: 0,
            // Example: 1.5, 3, 6
        },

        totalQuantityUnit: {
            type: String,
            required: true,
            enum: ['g', 'kg'],
            default: 'kg',
        },

        // Use-case text
        idealFor: {
            type: String,
            required: true,
            trim: true,
            // Example: "Ideal for individuals and gifting"
        },

        // Pricing
        price: {
            type: Number,
            required: true,
            min: 0,
        },

        originalPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        // Optional calculated discount
        discountPercentage: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
        },

        currency: {
            type: String,
            default: 'INR',
            trim: true,
        },

        // Badge such as "MOST POPULAR"
        badge: {
            type: String,
            trim: true,
            default: null,
        },

        // Used for highlighting the recommended plan
        isPopular: {
            type: Boolean,
            default: false,
        },


        durationMonths: {
            type: Number,
            required: true,
            min: 1
        },

        deliveriesPerMonth: {
            type: Number,
            default: 1
        },

        jarsPerDelivery: {
            type: Number,
            required: true,
            min: 1
        },

        // Whether users can currently purchase this plan
        isActive: {
            type: Boolean,
            default: true,
        },

        // Controls order in which plans appear
        displayOrder: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
)

module.exports = model('Plans', plansSchema)