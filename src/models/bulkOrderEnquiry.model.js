const mongoose = require('mongoose')

const bulkOrderEnquirySchema = new mongoose.Schema({

    // ─── Personal Info ────────────────────────────
    full_name: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minLength: [3, 'Name must be at least 3 characters'],
        maxLength: [50, 'Name cannot exceed 50 characters']
    },

    business_email: {
        type: String,
        required: [true, 'Business email is required'],
        trim: true,
        lowercase: true,
        maxLength: [80, 'Email cannot exceed 80 characters'],
        match: [
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            'Please provide a valid business email'
        ]
    },

    // ─── Order Info ───────────────────────────────
    expected_quantity: {
        type: String,
        required: [true, 'Expected quantity is required'],
        enum: {
            values: [
                '50-100',
                '100-250',
                '250-500',
                '500-1000',
                '1000+'
            ],
            message: 'Please select a valid quantity range'
        }
        // Dropdown options from UI
    },

    // ─── Quote Status — Admin manage karega ───────
    status: {
        type: String,
        enum: ['pending', 'contacted', 'confirmed', 'rejected'],
        default: 'pending'
    },

    // ─── Admin Notes ──────────────────────────────
    admin_notes: {
        type: String,
        trim: true,
        default: ''
        // Admin apne notes likh sakta hai
    },

    is_read: {
        type: Boolean,
        default: false
        // Admin ne dekha ya nahi
    }

}, { timestamps: true })

module.exports = mongoose.model('BulkOrderEnquiry', bulkOrderEnquirySchema)