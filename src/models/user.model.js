const { Schema, model } = require('mongoose');
const mongoose = require('mongoose');

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
  }
})

module.exports = model('User', userSchema);