const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
    {
        product_name: {
            type: String,
            required: true,
            trim: true
        },

        brand: {
            type: String,
            default: "SudhVeda Honey",
            trim: true
        },

        product_type: {
            type: String,
            required: true,
            enum: ["honey", "gift_box"]
        },

        floral_source: {
            type: String,
            required: true,
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
            required: true,
            trim: true
        },

        fssai_license_number: {
            type: String,
            required: true,
            trim: true
        },

        batch_number: {
            type: String,
            unique: true,
            index: true,
            trim: true
        },

        // -----------------------------------------
        // Nutrition Information
        // -----------------------------------------

        nutrition_info: {
            serving_size: {
                quantity: {
                    type: Number,
                    default: 1
                },

                unit: {
                    type: String,
                    default: "tbsp",
                    trim: true
                },

                weight_g: {
                    type: Number,
                    default: 21
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
                    },
                    rda_percent: {
                        type: Number,
                        default: null
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
                    },
                    rda_percent: {
                        type: Number,
                        default: null
                    }
                },

                saturated_fat: {
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
                    },
                    rda_percent: {
                        type: Number,
                        default: null
                    }
                },

                trans_fat: {
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
                    },
                    rda_percent: {
                        type: Number,
                        default: null
                    }
                },

                cholesterol: {
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
                    },
                    rda_percent: {
                        type: Number,
                        default: null
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
                    },
                    rda_percent: {
                        type: Number,
                        default: null
                    }
                },

                natural_sugar: {
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
                    },
                    rda_percent: {
                        type: Number,
                        default: null
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
                    },
                    rda_percent: {
                        type: Number,
                        default: null
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
                    },
                    rda_percent: {
                        type: Number,
                        default: null
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
                    },
                    rda_percent: {
                        type: Number,
                        default: null
                    }
                }
            }
        },


        // Existing references — unchanged

        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category"
        },

        imageDocumentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductImage"
        },

        videoDocumentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductVideo"
        },

        variantDocumentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductVariant"
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

module.exports = mongoose.model("Product", ProductSchema);