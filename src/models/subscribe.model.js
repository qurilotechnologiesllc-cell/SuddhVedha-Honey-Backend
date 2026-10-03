// models/subscribe.model.js
const mongoose = require('mongoose');

// Strict email regex: local part + @ + domain + TLD (min 2 letters)
const EMAIL_REGEX =
    /^(?!.*\.\.)[a-zA-Z0-9]([a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const subscribeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
            default: undefined,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            trim: true,
            lowercase: true,
            unique: true,
            maxlength: [50, 'Email cannot exceed 50 characters'],
            validate: {
                validator: (v) => EMAIL_REGEX.test(v),
                message: 'Please enter a valid email address',
            },
        },
        mobile: {
            type: String,
            trim: true,
            match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'],
            // empty string aaye to field save hi na ho
            set: (v) => (v === '' ? undefined : v),
            default: undefined,
        },
    },
    { timestamps: true }
);

const Subscribe = mongoose.model('Subscribe', subscribeSchema);

module.exports = Subscribe;