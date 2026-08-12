const mongoose = require('mongoose')

const honeyBenefitsSchema = new mongoose.Schema({

    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxLength: [100, 'Title cannot exceed 100 characters']
        // "Boosts Immunity", "Rich in Antioxidants"
    },

    category: {
        type: String,
        required:true,
        enum:['healthy', 'benefits']
    },

    public_id: {
        type: String,
        required: true,
        trim: true
    },

    duration: {
        type: Number,
        required: true,
        min: 0
    },

    format: {
        type: String,
        required: true,
        trim: true
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true })

module.exports = mongoose.model('HoneyBenefits', honeyBenefitsSchema)