const mongoose = require('mongoose')

const offerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Offer title is required'],
            trim: true,
            maxLength: [100, 'Title cannot exceed 100 characters']
            // "Free Shipping on ₹2000"
            // "10% OFF on ₹3000"
            // "Flat ₹500 OFF"
        },

        minimumOrderAmount: {
            type: Number,
            required: [true, 'Minimum order amount is required'],
            min: [0, 'Minimum order amount cannot be negative']
            // 2000, 3000, 5000
        },

        discountType: {
            type: String,
            required: [true, 'Discount type is required'],
            enum: {
                values: ['FREE_SHIPPING', 'PERCENTAGE', 'FLAT'],
                message: 'discountType must be FREE_SHIPPING, PERCENTAGE or FLAT'
            }
            // FREE_SHIPPING → Shipping free
            // PERCENTAGE    → % off on total
            // FLAT          → Fixed amount off
        },

        discountValue: {
            type: Number,
            required: [true, 'Discount value is required'],
            min: [0, 'Discount value cannot be negative']
            // FREE_SHIPPING → 0
            // PERCENTAGE    → 10 (matlab 10%)
            // FLAT          → 500 (matlab ₹500 off)
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
)

// ─── Custom Validation ───────────────────────────
// PERCENTAGE 1-100 ke beech honi chahiye
offerSchema.pre('save', async function () {
    if (this.discountType === 'PERCENTAGE') {
        if (this.discountValue < 1 || this.discountValue > 100) {
            throw new Error(
                'Percentage discount must be between 1 and 100'
            )
        }
    }

    // FREE_SHIPPING mein discountValue 0 hona chahiye
    if (this.discountType === 'FREE_SHIPPING') {
        this.discountValue = 0
    }
})

module.exports = mongoose.model('Offer', offerSchema)