import axios from 'axios';

const API_URL = '/api/users/';

const getAuthToken = () => {
    const token = localStorage.getItem('token');
    console.log('Auth token check:', token ? 'Token exists' : 'No token');
    return token;
};

const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem('token', token);
        console.log('Token saved to localStorage');
    } else {
        localStorage.removeItem('token');
        console.log('Token removed from localStorage');
    }
};

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const register = (companyName, tier) => {
    return axios.post(API_URL + 'register', { companyName, tier });
};


const getOnboardingCompany = (token) => {
    return axios.get(API_URL + `welcome/${token}`);
};


const createAdminUser = (token, userData) => {
    return axios.post(API_URL + `complete-onboarding/${token}`, userData);
};

const login = async (loginData) => {
    try {
        const response = await axios.post(API_URL + 'login', loginData);
        
        if (response.data.token) {
            setAuthToken(response.data.token);
            console.log('Login successful, token saved');
        }
        
        return response;
    } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
        throw error;
    }
};

const verifyAccountId = (accountId) => {
    return axios.post(API_URL + 'verify-account-id', { accountId });
};

const forgotPassword = (email) => {
    return axios.post(API_URL + 'forgot-password', { email });
};

const resetPassword = (token, password) => {
    return axios.put(API_URL + `reset-password/${token}`, { password });
};

const isAuthenticated = () => {
    return !!getAuthToken();
};

const logout = () => {
    setAuthToken(null);
    console.log('User logged out, token cleared');
};

const getCurrentToken = () => {
    return getAuthToken();
};

const authService = {
    register,
    getOnboardingCompany,
    createAdminUser,
    login,
    verifyAccountId,
    forgotPassword,
    resetPassword,
    isAuthenticated,
    logout,
    getCurrentToken,
    setAuthToken,
};

export default authService;