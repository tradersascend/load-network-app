const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },

  passwordResetToken: String,
  passwordResetExpires: Date,
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);