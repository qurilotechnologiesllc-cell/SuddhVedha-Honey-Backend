const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({

    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxLength: [100, 'Title cannot exceed 100 characters']
    },

    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxLength: [500, 'Message cannot exceed 500 characters']
    },

    notification_time: {
        type: Date,
        default: Date.now
    },

    is_read: {
        type: Boolean,
        default: false
    }

}, { timestamps: true })

module.exports = mongoose.model('Notification', notificationSchema)