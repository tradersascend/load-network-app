const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const alertSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    origin: {
        text: { type: String, required: true },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number] }
        }
    },
    originRadius: {
        type: Number, // in miles
        required: true,
    },
    destination: {
        text: { type: String, required: true },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number] }
        }
    },
    destinationRadius: {
        type: Number, // in miles
        required: true,
    },
    // To control if the alert is active or paused by the user
    isActive: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true,
});

alertSchema.index({ 'origin.location': '2dsphere' });
alertSchema.index({ 'destination.location': '2dsphere' });

module.exports = mongoose.model('Alert', alertSchema);