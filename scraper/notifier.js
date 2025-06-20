const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../server/.env') });

const Load = require('../server/models/Load');
const Alert = require('../server/models/Alert');
const User = require('../server/models/User');
const getTransporter = require('../server/config/email');

/**
 * Calculates the distance between two geographic coordinates in miles.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in miles
 */
function getDistanceInMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function processLoadNotifications() {
    console.log('--- Starting Load Notifier Process ---');
    let connection;
    try {
        connection = await mongoose.connect(process.env.MONGO_URI);
        console.log('Database connected.');

        const activeAlerts = await Alert.find({ isActive: true }).populate('user');
        if (activeAlerts.length === 0) {
            console.log('No active alerts found. Exiting.');
            return;
        }
        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentLoads = await Load.find({ createdAt: { $gte: fiveMinutesAgo } });
        if (recentLoads.length === 0) {
            console.log('No recent loads found. Exiting.');
            return;
        }
        
        console.log(`Found ${activeAlerts.length} active alerts to process against ${recentLoads.length} recent loads.`);
        const transporter = await getTransporter();

        for (const load of recentLoads) {
            for (const alert of activeAlerts) {
    if (!load.origin.location?.coordinates?.length ||
        !load.destination.location?.coordinates?.length ||
        !alert.origin.location?.coordinates?.length ||
        !alert.destination.location?.coordinates?.length) {
        continue;
    }

    console.log(`\n--- Checking Load from ${load.origin.city} against Alert for ${alert.origin.text} ---`);

console.log(`   - Load Origin Coords: ${load.origin.location.coordinates}`);
console.log(`   - Alert Origin Coords: ${alert.origin.location.coordinates}`);

const originDistance = getDistanceInMiles(
    alert.origin.location.coordinates[1],
    alert.origin.location.coordinates[0],
    load.origin.location.coordinates[1],
    load.origin.location.coordinates[0]
);
console.log(`   => Origin Distance: ${originDistance.toFixed(2)} mi. (Alert Radius: ${alert.originRadius} mi)`);
const isOriginMatch = originDistance <= alert.originRadius;

console.log(`   - Load Destination Coords: ${load.destination.location.coordinates}`);
console.log(`   - Alert Destination Coords: ${alert.destination.location.coordinates}`);

// --- Calculate and log the destination distance ---
const destinationDistance = getDistanceInMiles(
    alert.destination.location.coordinates[1],
    alert.destination.location.coordinates[0],
    load.destination.location.coordinates[1],
    load.destination.location.coordinates[0]
);
console.log(`   => Destination Distance: ${destinationDistance.toFixed(2)} mi. (Alert Radius: ${alert.destinationRadius} mi)`);
const isDestinationMatch = destinationDistance <= alert.destinationRadius;

console.log(`   Match Status: Origin=<span class="math-inline">\{isOriginMatch\}, Destination\=</span>{isDestinationMatch}`);


    // If BOTH conditions are true, send the notification
    if (isOriginMatch && isDestinationMatch) {
        console.log(`✅ MATCH FOUND! Sending email to ${alert.user.email}`);

        const emailMessage = { /* ... my email message ... */ };
    }
}
        }
        console.log('--- Finished Load Notifier Process ---');
    } catch (error) {
        console.error("An error occurred in the notifier script:", error);
    } finally {
        if (connection) {
            await mongoose.disconnect();
            console.log('Database disconnected.');
        }
    }
}

// Run the function
processLoadNotifications();