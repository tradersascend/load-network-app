const mongoose = require('mongoose');

const zipCodeSchema = new mongoose.Schema({
    zip: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    lat: {
        type: Number,
        required: true,
        index: true
    },
    lng: {
        type: Number,
        required: true,
        index: true
    },
    city: {
        type: String,
        required: true,
        index: true
    },
    state_id: {
        type: String,
        required: true,
        index: true
    },
    state_name: {
        type: String,
        required: true
    },
    county_name: {
        type: String
    },
    population: {
        type: Number,
        default: 0
    },
    density: {
        type: Number,
        default: 0
    }
});

// Create compound index for location-based queries
zipCodeSchema.index({ lat: 1, lng: 1 });
zipCodeSchema.index({ city: 1, state_id: 1 });

module.exports = mongoose.model('ZipCode', zipCodeSchema);