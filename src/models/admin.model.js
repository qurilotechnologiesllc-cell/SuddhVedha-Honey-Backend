const mongoose = require('mongoose')

const adminAuthSchema = new mongoose.Schema({

    fullname: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minLength: [3, 'Full name must be at least 3 characters'],
        maxLength: [50, 'Full name cannot exceed 50 characters']
    },

    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        lowercase: true,
        minLength: [3, 'Username must be at least 3 characters'],
        maxLength: [30, 'Username cannot exceed 30 characters']
        // "sudhveda_admin", "admin123"
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            'Please provide a valid email address'
        ]
    },

    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
        match: [
            /^[6-9][0-9]{9}$/,
            'Please provide a valid 10 digit phone number'
        ]
    },

    profile_img: {
        type: String,
        default: ""
    },

    public_id: {
        type: String,
        default: ""
    },


    role: {
        type: String,
        enum: ['superadmin', 'admin'],
        default: 'admin'
    },

    // Notifications On/Off
    notificationEnabled: {
        type: Boolean,
        default: true
        // true  → Notifications milenge
        // false → Notifications band
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true })

module.exports = mongoose.model('Admin', adminAuthSchema)