const mongoose = require('mongoose')

const userEnquirySchema = new mongoose.Schema({

    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minLength: [3, 'Name must be at least 3 characters'],
        maxLength: [50, 'Name cannot exceed 50 characters']
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        maxLength: [50, 'Email cannot exceed 50 characters'],
        match: [
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            'Please provide a valid email address'
        ]
    },

    mobile: {
        type: String,
        required: [true, 'Mobile number is required'],
        trim: true,
        match: [
            /^[6-9][0-9]{9}$/,
            // ↑ Indian number:
            // 6,7,8,9 se start ho
            // Total 10 digits
            'Please provide a valid 10 digit mobile number'
        ]
    },

    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
        minLength: [5, 'Subject must be at least 5 characters'],
        maxLength: [100, 'Subject cannot exceed 100 characters']
    },

    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        minLength: [10, 'Message must be at least 10 characters'],
        maxLength: [500, 'Message cannot exceed 500 characters']
    },

    // Track karne ke liye — Admin ne dekha ya nahi
    is_read: {
        type: Boolean,
        default: false
    }

}, { timestamps: true })

module.exports = mongoose.model('UserEnquiry', userEnquirySchema)