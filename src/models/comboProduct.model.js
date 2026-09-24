const mongoose = require("mongoose");

const ComboProductSchema = new mongoose.Schema(
    {
        combo_name: {
            type: String,
            required: true,
            trim: true
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        brand: {
            type: String,
            default: "SudhVeda Honey",
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        key_benefits: {
            type: String,
            required: true,
            trim: true
        },

        manufacturer_information: {
            type: String,
            required: true,
            trim: true
        },

        shelf_life: {
            type: String,
            required: true,
            trim: true
        },

        storage_instructions: {
            type: String,
            required: true,
            trim: true
        },

        country_of_origin: {
            type: String,
            default: "India",
            trim: true
        },

        fssai_license_number: {
            type: String,
            required: true,
            trim: true
        },

        is_active: {
            type: Boolean,
            default: true
        },

        // isme us combo product ke sare ComboPack (set of 2, set of 3 etc.) ki ids store hongi
        setPacks: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ComboPack"
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "ComboProduct",
    ComboProductSchema
);