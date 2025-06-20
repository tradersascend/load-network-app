const Truck = require('../models/Truck');

const getTrucks = async (req, res) => {
  try {
    const trucks = await Truck.find({ owner: req.user.id });
    res.status(200).json(trucks);
  } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

const addTruck = async (req, res) => {
  try {
    const { name, unitNumber, truckType } = req.body;
    if (!name || !unitNumber || !truckType) {
      return res.status(400).json({ message: 'Please provide all truck details' });
    }
    const truck = await Truck.create({ name, unitNumber, truckType, owner: req.user.id });
    res.status(201).json(truck);
  } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

const updateTruck = async (req, res) => {
  try {
    const truck = await Truck.findById(req.params.id);
    if (!truck) { return res.status(404).json({ message: 'Truck not found' }); }
    if (truck.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    const { name, unitNumber, truckType, currentLocation } = req.body;
    const updatedTruck = await Truck.findByIdAndUpdate(req.params.id, { name, unitNumber, truckType, currentLocation }, { new: true });
    res.status(200).json(updatedTruck);
  } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

const updateTruckStatus = async (req, res) => {
    try {
        const truck = await Truck.findById(req.params.id);
        if (!truck) {
            return res.status(404).json({ message: 'Truck not found.' });
        }
        // Ensure the user owns this truck
        if (truck.owner.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized.' });
        }
        
        const { status } = req.body;
        if (!status || !['Available', 'Covered', 'Out of Duty'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status provided.' });
        }

        truck.status = status;
        await truck.save();
        res.status(200).json(truck);

    } catch (error) {
        console.error("UPDATE STATUS ERROR:", error);
        res.status(500).json({ message: 'Server error while updating status.' });
    }
};

const deleteTruck = async (req, res) => {
  try {
    const truck = await Truck.findById(req.params.id);
    if (!truck) { return res.status(404).json({ message: 'Truck not found' }); }
    if (truck.owner.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    await truck.deleteOne();
    res.status(200).json({ id: req.params.id, message: 'Truck deleted' });
  } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

module.exports = { getTrucks, addTruck, updateTruck, updateTruckStatus, deleteTruck };