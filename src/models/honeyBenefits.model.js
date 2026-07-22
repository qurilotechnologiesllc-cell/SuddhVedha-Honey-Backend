const mongoose = require('mongoose')

const honeyBenefitsSchema = new mongoose.Schema({

    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxLength: [100, 'Title cannot exceed 100 characters']
        // "Boosts Immunity", "Rich in Antioxidants"
    },

    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxLength: [500, 'Description cannot exceed 500 characters']
    },

    category: {
        type: String,
        required:true,
        enum:['healthy', 'benefits']
    },

    image: {
        type: String,
        required: [true, 'Image is required']
        // Cloudinary secure_url
    },

    public_id: {
        type: String,
        required: [true, 'Public ID is required']
        // Cloudinary public_id — delete ke liye
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true })

module.exports = mongoose.model('HoneyBenefits', honeyBenefitsSchema)