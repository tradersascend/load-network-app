import axios from 'axios';

const API_URL = '/api/users/';

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