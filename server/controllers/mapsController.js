const { Client } = require("@googlemaps/google-maps-services-js");
const ZipCode = require('../models/ZipCode');

const mapsClient = new Client({});

const calculateDeadhead = async (req, res) => {
    console.log("Deadhead calculation request received:", req.body);
    
    // 1. Destructure the new properties from the request body.
    const { truckZip, loadOriginZip } = req.body;

    // 2. Update validation for the new properties.
    if (!truckZip || !loadOriginZip) {
        console.log("Missing required data:", { truckZip, loadOriginZip });
        return res.status(400).json({ message: "Missing truck or load origin ZIP code." });
    }

    try {
        // 3. Attempt direct distance calculation with Google Maps API first.
        try {
            console.log(`Trying Google Distance Matrix API for ${truckZip} to ${loadOriginZip}`);
            
            const distanceResponse = await mapsClient.distancematrix({
                params: {
                    origins: [truckZip],
                    destinations: [loadOriginZip],
                    key: process.env.Maps_API_KEY,
                    units: 'imperial',
                    mode: 'driving',
                },
            });

            const element = distanceResponse.data.rows[0]?.elements[0];
            
            if (element && element.status === 'OK' && element.distance) {
                const distance = element.distance.text;
                console.log(`Successfully calculated driving distance: ${distance}`);
                return res.status(200).json({ distance });
            }
            
            console.log(`Google API failed or returned no results. Status: ${element?.status}`);

        } catch (error) {
            console.log(`Google Distance Matrix API error:`, error.message);
        }

        // 4. If API fails, fall back to straight-line distance using local ZIP database.
        console.log("Falling back to straight-line distance calculation.");
        try {
            const truckZipRecord = await ZipCode.findOne({ zip: truckZip });
            const loadZipRecord = await ZipCode.findOne({ zip: loadOriginZip });

            if (truckZipRecord && loadZipRecord) {
                const distance = calculateStraightLineDistance(
                    truckZipRecord.lat, 
                    truckZipRecord.lng, 
                    loadZipRecord.lat, 
                    loadZipRecord.lng
                );
                
                const formattedDistance = `${distance.toFixed(0)} mi (straight-line)`;
                console.log(`Successfully calculated straight-line distance: ${formattedDistance}`);
                return res.status(200).json({ 
                    distance: formattedDistance,
                    note: "Driving directions unavailable - showing straight-line distance"
                });
            }
        } catch (dbError) {
            console.log("Database lookup for fallback failed:", dbError.message);
        }

        // 5. If all methods fail, return an error message.
        console.log("All deadhead calculation methods failed.");
        return res.status(500).json({ 
            message: "Unable to calculate distance for the provided ZIP codes."
        });

    } catch (error) {
        console.error("DEADHEAD CALCULATION ERROR:", error.response?.data?.error_message || error.message);
        res.status(500).json({ message: "Failed to calculate distance. Please try again." });
    }
};

/**
 * Calculate straight-line distance between two points using Haversine formula
 */
const calculateStraightLineDistance = (lat1, lng1, lat2, lng2) => {
    const R = 3963.2; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Get all ZIP codes within a radius using local database
 */
const getZipCodesInRadius = async (req, res) => {
    console.log("ZIP codes in radius request:", req.body);
    
    const { location, radiusMiles } = req.body;
    
    if (!location || !radiusMiles) {
        return res.status(400).json({ message: "Location and radius are required." });
    }

    const radius = parseFloat(radiusMiles);
    if (isNaN(radius) || radius <= 0 || radius > 500) {
        return res.status(400).json({ message: "Radius must be between 1 and 500 miles." });
    }

    try {
        const zipCodes = await findNearbyZipCodes(location, radius);
        
        console.log(`Found ${zipCodes.length} ZIP codes within ${radiusMiles} miles of ${location}`);
        
        res.status(200).json({ zipCodes });

    } catch (error) {
        console.error("Error finding ZIP codes in radius:", error);
        res.status(500).json({ message: "Failed to find ZIP codes in radius." });
    }
};

/**
 * Find nearby ZIP codes using local database - MUCH FASTER!
 */
const findNearbyZipCodes = async (location, radiusMiles) => {
    try {
        // First, get coordinates for the location
        let centerLat, centerLng;
        
        // Check if location is already a ZIP code
        if (/^\d{5}$/.test(location.trim())) {
            const zipRecord = await ZipCode.findOne({ zip: location.trim() });
            if (zipRecord) {
                centerLat = zipRecord.lat;
                centerLng = zipRecord.lng;
                console.log(`Using ZIP code ${location} coordinates:`, { centerLat, centerLng });
            } else {
                throw new Error(`ZIP code ${location} not found in database`);
            }
        } else {
            // Geocode the location
            const geocodeResponse = await mapsClient.geocode({
                params: {
                    address: location,
                    key: process.env.Maps_API_KEY
                }
            });

            if (geocodeResponse.data.results.length === 0) {
                throw new Error(`Could not find location: ${location}`);
            }

            centerLat = geocodeResponse.data.results[0].geometry.location.lat;
            centerLng = geocodeResponse.data.results[0].geometry.location.lng;
            console.log(`Geocoded ${location} coordinates:`, { centerLat, centerLng });
        }

        // Convert miles to degrees (approximate)
        // 1 degree of latitude ≈ 69 miles
        // 1 degree of longitude varies by latitude, but I'll use an approximation
        const latDegrees = radiusMiles / 69;
        const lngDegrees = radiusMiles / (69 * Math.cos(centerLat * Math.PI / 180));

        console.log(`Searching within ${latDegrees}° lat and ${lngDegrees}° lng`);

        // Query ZIP codes within the bounding box
        const zipCodes = await ZipCode.find({
            lat: {
                $gte: centerLat - latDegrees,
                $lte: centerLat + latDegrees
            },
            lng: {
                $gte: centerLng - lngDegrees,
                $lte: centerLng + lngDegrees
            }
        }).select('zip lat lng');

        // Filter by actual distance using Haversine formula
        const validZipCodes = zipCodes.filter(zipCode => {
            const distance = calculateDistance(centerLat, centerLng, zipCode.lat, zipCode.lng);
            return distance <= radiusMiles;
        });

        console.log(`Found ${validZipCodes.length} ZIP codes within ${radiusMiles} miles of ${location}`);
        
        return validZipCodes.map(zc => zc.zip);
        
    } catch (error) {
        console.error("Error in findNearbyZipCodes:", error);
        throw error;
    }
};

/**
 * Get ZIP codes for a city using local database
 */
const getCityZipCodes = async (cityName) => {
    try {
        console.log(`Getting ZIP codes for city: ${cityName}`);
        
        const parts = cityName.split(',');
        const city = parts[0].trim();
        const state = parts.length > 1 ? parts[1].trim() : null;
        
        let query = {
            // This is the base query for the city name
            city: new RegExp(`^${city}$`, 'i')
        };
        
        if (state) {
            query = {
                $and: [
                    { city: new RegExp(`^${city}$`, 'i') },
                    { 
                        $or: [
                            { state_id: new RegExp(`^${state}$`, 'i') },
                            { state_name: new RegExp(`^${state}$`, 'i') }
                        ]
                    }
                ]
            };
        }
        
        const zipRecords = await ZipCode.find(query).select('zip');
        const zipCodes = zipRecords.map(record => record.zip);
        
        console.log(`Found ${zipCodes.length} ZIP codes for ${cityName}:`, zipCodes.slice(0, 10), zipCodes.length > 10 ? '...' : '');
        
        return zipCodes;
        
    } catch (error) {
        console.error(`Error getting ZIP codes for city ${cityName}:`, error);
        return [];
    }
};

/**
 * Calculate distance between two points using Haversine formula
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 3963.2; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

module.exports = {
    calculateDeadhead,
    getZipCodesInRadius,
    findNearbyZipCodes,
    getCityZipCodes,
    calculateDistance,
};