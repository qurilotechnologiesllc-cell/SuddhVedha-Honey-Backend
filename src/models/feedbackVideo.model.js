const mongoose = require('mongoose');

const feedbackVideoSchema = new mongoose.Schema(
    {
        public_id: {
            type: String,
            required: true,
            unique: true,
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
            trim: true,
            lowercase: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('FeedbackVideo', feedbackVideoSchema);