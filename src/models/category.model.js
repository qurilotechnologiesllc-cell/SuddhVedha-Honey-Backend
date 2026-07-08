const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({

    category_name: {
        type: String,
        required: true,
        unique: true,
        trim: true
        // "Raw Honey", "Flavored Honey"
    },

    slug: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true
        // "raw-honey", "flavored-honey"
    },

    description: {
        type: String,
        trim: true
        // "Pure unprocessed honey from beehive"
    },

    is_active: {
        type: Boolean,
        default: true
    }

}, { timestamps: true })

// Slug auto-generate karo category_name se
categorySchema.pre('save', async function () {
    // next parameter bilkul mat likho!
    if (this.isModified('category_name')) {
        this.slug = this.category_name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
    }
    // next() bhi nahi chahiye!
})

module.exports = mongoose.model('Category', categorySchema)