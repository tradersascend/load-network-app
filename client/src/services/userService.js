import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://load-network-api.onrender.com';
const API_URL = `${API_BASE_URL}/api/users/`;

// For an admin to create a new user
const createUser = (userData) => {
  return axios.post(API_URL + 'create-user', userData);
};

// For an admin to get all users in their company
const getCompanyUsers = () => {
    return axios.get(API_URL + 'company-users');
};

// For an admin to delete a user
const deleteUser = (userId) => {
    return axios.delete(API_URL + `manage-user/${userId}`);
};

const updateUser = (userId, userData) => {
    return axios.put(API_URL + `manage-user/${userId}`, userData);
};

const userService = {
  createUser,
  getCompanyUsers,
  deleteUser,
  updateUser,
};

export default userService;

/* import axios from 'axios';

const API_URL = 'https://load-network-api.onrender.com/api/users/';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://load-network-api.onrender.com';
const API_URL = `${API_BASE_URL}/api/users/`;

// For an admin to create a new user
const createUser = (userData) => {
  return axios.post(API_URL + 'create-user', userData);
};

// For an admin to get all users in their company
const getCompanyUsers = () => {
    return axios.get(API_URL + 'company-users');
};

// For an admin to delete a user
const deleteUser = (userId) => {
    return axios.delete(API_URL + `manage-user/${userId}`);
};

const updateUser = (userId, userData) => {
    return axios.put(API_URL + `manage-user/${userId}`, userData);
};

const userService = {
  createUser,
  getCompanyUsers,
  deleteUser,
  updateUser,
};

export default userService; */