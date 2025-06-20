const express = require('express');
const router = express.Router();
const {
  getTrucks,
  addTruck,
  updateTruck,
  deleteTruck,
  updateTruckStatus,
} = require('../controllers/truckController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getTrucks)
  .post(protect, addTruck);

router.route('/:id')
  .put(protect, updateTruck)
  .delete(protect, deleteTruck);

router.patch('/:id/status', protect, updateTruckStatus);

module.exports = router;