const { Client } = require("@googlemaps/google-maps-services-js");
const mapsClient = new Client({});
const Load = require('../models/Load');
const { findNearbyZipCodes, getCityZipCodes } = require('./mapsController');

// Helper function to check if a string is a ZIP code (5 digits)
const isZipCode = (str) => /^\d{5}$/.test(str.trim());

const parseCityStatePairs = (input) => {
    const parts = input.split(',').map(part => part.trim()).filter(Boolean);
    const pairs = [];
    
    // Group parts into city-state pairs
    for (let i = 0; i < parts.length; i += 2) {
        if (i + 1 < parts.length) {
            // I have both city and state
            const city = parts[i];
            const state = parts[i + 1];
            pairs.push(`${city}, ${state}`);
        } else {
            // Only city left (odd number of parts), treat as city only
            pairs.push(parts[i]);
        }
    }
    
    return pairs;
};

const getLocationCondition = async (location, radius, fieldPrefix) => {
    const trimmedLocation = location.trim();

    // The reliable radius logic
    if (radius && parseFloat(radius) > 0) {
        console.log(`Searching with radius for: ${trimmedLocation} within ${radius} miles`);
        try {
            const zipCodes = await findNearbyZipCodes(trimmedLocation, parseFloat(radius));
            if (zipCodes.length > 0) {
                return { [`${fieldPrefix}.zip`]: { $in: zipCodes } };
            } else {
                console.warn(`Radius search for "${trimmedLocation}" found no matching ZIP codes.`);
                return { [`${fieldPrefix}.zip`]: "IMPOSSIBLE_ZIP_CODE_NO_RESULTS" };
            }
        } catch (error) {
            console.error(`Error finding ZIPs in radius for ${trimmedLocation}. It will not be included in search results.`, error.message);
            return { [`${fieldPrefix}.zip`]: "IMPOSSIBLE_ZIP_CODE_ERROR" };
        }
    }

    // Non-radius logic
    if (isZipCode(trimmedLocation)) {
        return { [`${fieldPrefix}.zip`]: trimmedLocation };
    } else {
        // This block handles inputs like "SAVANNAH, GA"
        try {
            const cityZipCodes = await getCityZipCodes(trimmedLocation);
            if (cityZipCodes.length > 0) {
                // Parse the city name from the "City, ST" string for the regex search.
                const cityOnly = trimmedLocation.split(',')[0].trim();
                return {
                    $or: [
                        { [`${fieldPrefix}.zip`]: { $in: cityZipCodes } },
                        { [`${fieldPrefix}.city`]: new RegExp(`^${cityOnly}$`, 'i') }
                    ]
                };
            }
        } catch (error) {
            console.error(`Error getting city ZIP codes for ${trimmedLocation}, using city name only.`, error.message);
        }
        // Fallback logic - use only the city part
        const cityOnlyForFallback = trimmedLocation.split(',')[0].trim();
        return { [`${fieldPrefix}.city`]: new RegExp(`^${cityOnlyForFallback}$`, 'i') };
    }
};

const searchLoads = async (req, res) => {
    try {
        console.log("Search parameters received:", req.query);
        
        const { origin, originRadius, destination, destinationRadius, date } = req.query;
        let andConditions = [];

        // --- ORIGIN SEARCH LOGIC ---
        if (origin) {
            const originLocations = parseCityStatePairs(origin);
            if (originLocations.length > 0) {
                console.log(`Processing ${originLocations.length} origin locations:`, originLocations);
                const originQueryConditions = await Promise.all(
                    originLocations.map(loc => getLocationCondition(loc, originRadius, 'origin'))
                );
                andConditions.push({ $or: originQueryConditions });
            }
        }

        // --- DESTINATION SEARCH LOGIC  ---
        if (destination) {
            const destinationLocations = parseCityStatePairs(destination);
            if (destinationLocations.length > 0) {
                console.log(`Processing ${destinationLocations.length} destination locations:`, destinationLocations);
                const destinationQueryConditions = await Promise.all(
                    destinationLocations.map(loc => getLocationCondition(loc, destinationRadius, 'destination'))
                );
                // Find loads that match ANY of the provided destination conditions
                andConditions.push({ $or: destinationQueryConditions });
            }
        }
        
        const query = andConditions.length > 0 ? { $and: andConditions } : {};
        console.log("Final MongoDB query:", JSON.stringify(query, null, 2));
        
        let loads = await Load.find(query).sort({ createdAt: -1 });
        console.log(`Database query returned ${loads.length} loads.`);

        // --- DATE FILTERING ---
        if (date) {
            const searchDate = new Date(date + 'T00:00:00.000Z');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const hasNumbers = (str) => /\d/.test(str);

            loads = loads.filter(load => {
                const loadDateString = load.pickupDate;
                let effectiveLoadDate;

                if (hasNumbers(loadDateString)) {
                    effectiveLoadDate = new Date(loadDateString);
                } else {
                    effectiveLoadDate = today;
                }

                return effectiveLoadDate.toDateString() === searchDate.toDateString();
            });
            
            console.log(`After date filtering: ${loads.length} loads.`);
        }

        res.status(200).json(loads);

    } catch (error) {
        console.error('Search Error:', error);
        
        if (error.response?.data?.error_message) {
            return res.status(400).json({ 
                message: `Geocoding error: ${error.response.data.error_message}` 
            });
        }
        
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    searchLoads,
};