import axios from 'axios';

const API_URL = '/api/alerts/';

// Get all alerts for the logged-in user
const getAlerts = () => {
    return axios.get(API_URL);
};

// Create a new alert
const createAlert = (alertData) => {
    return axios.post(API_URL, alertData);
};

// Delete a specific alert
const deleteAlert = (alertId) => {
    return axios.delete(API_URL + alertId);
};

const alertService = {
    getAlerts,
    createAlert,
    deleteAlert,
};

export default alertService;