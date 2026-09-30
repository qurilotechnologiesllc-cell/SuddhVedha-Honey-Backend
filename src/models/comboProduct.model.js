const mongoose = require("mongoose");

const ComboProductSchema = new mongoose.Schema(
    {
        // Example: "Golden Duo"
        combo_name: {
            type: String,
            required: true,
            trim: true
        },

        // Example:
        // mustard-honey-lychee-honey-golden-duo
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

        // Total number of jars/products in combo
        // Example: 2
        combo_size: {
            type: Number,
            required: true,
            min: 2
        },

        // Products included inside combo
        // Products included inside combo
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
                    min: 1
                },

                unit: {
                    type: String,
                    required: true,
                    enum: ["g", "kg"]
                }
            }
        ],

        // =========================
        // PRICING
        // =========================

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
            required: true,
            min: 0,
            max: 100
        },

        save: {
            type: Number,
            required: true,
            min: 0
        },

        // =========================
        // PRODUCT DETAILS
        // =========================

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

        nutrition_info: {
            serving_size: {
                quantity: {
                    type: Number,
                    default: 1
                },

                unit: {
                    type: String,
                    default: "serving",
                    trim: true
                },

                weight_g: {
                    type: Number,
                    default: 20
                }
            },

            nutrients: {
                energy: {
                    unit: {
                        type: String,
                        default: "kcal"
                    },
                    per_100g: {
                        type: Number,
                        default: 0
                    },
                    per_serving: {
                        type: Number,
                        default: 0
                    }
                },

                carbohydrates: {
                    unit: {
                        type: String,
                        default: "g"
                    },
                    per_100g: {
                        type: Number,
                        default: 0
                    },
                    per_serving: {
                        type: Number,
                        default: 0
                    }
                },

                total_sugar: {
                    unit: {
                        type: String,
                        default: "g"
                    },
                    per_100g: {
                        type: Number,
                        default: 0
                    },
                    per_serving: {
                        type: Number,
                        default: 0
                    }
                },

                added_sugar: {
                    unit: {
                        type: String,
                        default: "g"
                    },
                    per_100g: {
                        type: Number,
                        default: 0
                    },
                    per_serving: {
                        type: Number,
                        default: 0
                    }
                },

                protein: {
                    unit: {
                        type: String,
                        default: "g"
                    },
                    per_100g: {
                        type: Number,
                        default: 0
                    },
                    per_serving: {
                        type: Number,
                        default: 0
                    }
                },

                total_fat: {
                    unit: {
                        type: String,
                        default: "g"
                    },
                    per_100g: {
                        type: Number,
                        default: 0
                    },
                    per_serving: {
                        type: Number,
                        default: 0
                    }
                },

                sodium: {
                    unit: {
                        type: String,
                        default: "mg"
                    },
                    per_100g: {
                        type: Number,
                        default: 0
                    },
                    per_serving: {
                        type: Number,
                        default: 0
                    }
                }
            }
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
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "ComboProduct",
    ComboProductSchema
);