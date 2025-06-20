const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const templateSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // A short name for the template like "Rate Inquiry"
    title: {
        type: String,
        required: true,
        trim: true,
    },
    // The full message body of the template
    message: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Template', templateSchema);