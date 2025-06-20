const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const truckSchema = new Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  unitNumber: {
    type: String,
    required: true,
  },
  truckType: {
    type: String,
    required: true,
    enum: ['Cargo Van', 'Sprinter Van', 'Small Straight', 'Large Straight'],
  },
  status: {
    type: String,
    enum: ['Available', 'Covered', 'Out of Duty'],
    default: 'Available',
  },
  currentLocation: {
    type: String,
    default: '',
},
}, {
  timestamps: true,
});

module.exports = mongoose.model('Truck', truckSchema);