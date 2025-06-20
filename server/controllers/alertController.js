const Alert = require('../models/Alert');
const { Client } = require("@googlemaps/google-maps-services-js");
const mapsClient = new Client({});

const getCoords = async (address) => {
    if (!address) return null;
    try {
        const response = await mapsClient.geocode({
            params: { address, key: process.env.Maps_API_KEY }
        });
        if (response.data.results.length > 0) {
            const { lat, lng } = response.data.results[0].geometry.location;
            return { type: 'Point', coordinates: [lng, lat] };
        }
        return null;
    } catch (error) {
        console.error("Geocoding failed for:", address, error.response?.data?.error_message);
        return null;
    }
};

// Get all alerts for the currently logged-in user
const getAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find({ user: req.user.id });
        res.status(200).json(alerts);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Create a new alert for the user
const createAlert = async (req, res) => {
    try {
        const { origin, originRadius, destination, destinationRadius } = req.body;
        if (!origin || !originRadius || !destination || !destinationRadius) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Geocode the origin and destination addresses
        const originLocation = await getCoords(origin);
        const destinationLocation = await getCoords(destination);

        if (!originLocation || !destinationLocation) {
            return res.status(400).json({ message: 'Could not find coordinates for the provided locations.' });
        }

        const alert = await Alert.create({
            user: req.user.id,
            origin: { text: origin, location: originLocation },
            originRadius,
            destination: { text: destination, location: destinationLocation },
            destinationRadius,
        });

        res.status(201).json(alert);

    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Delete an alert
const deleteAlert = async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);
        if (!alert) { return res.status(404).json({ message: 'Alert not found.' }); }
        if (alert.user.toString() !== req.user.id) { return res.status(401).json({ message: 'User not authorized.' }); }

        await alert.deleteOne();
        res.status(200).json({ id: req.params.id, message: 'Alert deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getAlerts,
    createAlert,
    deleteAlert,
};