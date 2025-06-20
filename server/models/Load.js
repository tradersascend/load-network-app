const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const locationSchema = new Schema({
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  }
}, { _id: false });

const loadSchema = new Schema({
  sourceId: { type: String, required: true, unique: true, },
  origin: { type: locationSchema, required: true, },
  destination: { type: locationSchema, required: true, },
  miles: { type: Number, required: true, },
  truckType: { type: String, required: true, },
  weight: { type: Number, },
  pieces: { type: Number, },
  pickupDate: { type: String, required: true, },
  deliveryDateTime: { type: String, required: true, },
  brokerName: { type: String, },
  brokerEmail: { type: String, },
  deadhead: { type: Number },
  bidders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  brokerNotes: { type: String },
  // Timestamps for tracking
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    // Internal field for synchronization (used by Method 3)
     _isStale: {
        type: Boolean,
        default: false,
        select: false 
    }
}, {
  timestamps: true,
  collection: 'loads'
});

// Create geospatial indexes for both origin and destination for fast radius searches
loadSchema.index({ 'origin.location': '2dsphere' });
loadSchema.index({ 'destination.location': '2dsphere' });

module.exports = mongoose.model('Load', loadSchema);