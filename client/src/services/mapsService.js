import axios from 'axios';

const API_URL = '/api/maps/';

const api = axios.create({
    baseURL: API_URL,
});

const getAuthToken = () => {
    const token = localStorage.getItem('token');
    console.log('Getting auth token:', token ? 'Token found' : 'No token found');
    console.log('Token length:', token ? token.length : 0);
    return token;
};

api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Added Authorization header to request');
    } else {
        console.error('No token available for request');
    }
    return config;
}, (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => {
        console.log('Request successful:', response.config.url);
        return response;
    },
    (error) => {
        console.error('Response error:', error.response?.status, error.response?.data);
        
        if (error.response?.status === 401) {
            console.error('Authentication failed - token may be invalid or expired');
            console.error('Current token:', getAuthToken() ? 'Present' : 'Missing');
            
            // Check if token exists but is invalid
            const token = getAuthToken();
            if (token) {
                console.error('Token exists but authentication failed. Token might be expired.');
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Calculates the deadhead distance by sending user and origin coordinates to the backend.
 * @param {object} locationData - { truckZip, loadOriginZip }
 * @returns {Promise} Axios promise
 */
const calculateDeadhead = (locationData) => {
    const token = getAuthToken();
    console.log('Sending deadhead request with token:', !!token);
    console.log('Location data:', locationData);
    
    if (!token) {
        console.error('No authentication token available for deadhead calculation');
        return Promise.reject(new Error('Authentication token not found'));
    }
    
    return api.post('calculate-deadhead', locationData);
};

/**
 * Gets all ZIP codes within a specified radius of a location
 * @param {string} location - City name or ZIP code
 * @param {number} radiusMiles - Radius in miles
 * @returns {Promise} Promise resolving to array of ZIP codes
 */
const getZipCodesInRadius = (location, radiusMiles) => {
    const token = getAuthToken();
    console.log('Sending ZIP codes request with token:', !!token);
    
    if (!token) {
        console.error('No authentication token available for ZIP codes request');
        return Promise.reject(new Error('Authentication token not found'));
    }
    
    return api.post('zip-codes-in-radius', { location, radiusMiles });
};

const mapsService = {
    calculateDeadhead,
    getZipCodesInRadius,
};

export default mapsService;