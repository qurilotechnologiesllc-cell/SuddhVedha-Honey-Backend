const { Schema, model } = require('mongoose')
const mongoose = require('mongoose')

const userSchema = new Schema({

  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minLength: [3, 'Name must be at least 3 characters'],
    maxLength: [50, 'Name cannot exceed 50 characters']
  },

  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    trim: true,
    match: [
      /^[6-9][0-9]{9}$/,
      'Please provide a valid 10 digit mobile number'
    ]
  },

  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxLength: [80, 'Email cannot exceed 80 characters'],
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please provide a valid email address'
    ]
    // Optional — OTP se register hota hai
  },

  password: {
    type: String,
    minLength: [6, 'Password must be at least 6 characters']
    // Optional — OTP login ke liye
  },

  DOB: {
    type: String,
    trim: true,
    match: [
      /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
      'DOB must be in DD/MM/YYYY format'
    ]
    // Indian standard: "15/08/1995"
  },

  gender: {
    type: String,
    enum: {
      values: ['male', 'female', 'other'],
      message: 'Gender must be male, female or other'
    },
    lowercase: true
  },

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'  // ← Default user
  }

}, { timestamps: true })

module.exports = model('User', userSchema)