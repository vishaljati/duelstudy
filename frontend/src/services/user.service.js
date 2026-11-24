
import api from "../api/axios.js";
import API from "../api/endpoints.js";

// Register a new user
const registerUser = async (userData) => {
  const response = await api.post(
    API.USER.REGISTER,
    userData,
    { skipAuthRefresh: true }
  );
  return response.data;
};

// Login existing user
const loginUser = async (credentials) => {
  const response = await api.post(
    API.USER.LOGIN,
    credentials,
    { skipAuthRefresh: true }
  );

  return response.data;
};

// Get currently authenticated user
const getCurrentUser = async () => {
  const response = await api.get(API.USER.ME);

  return response.data;
};

// Logout current user
const logoutUser = async () => {
  const response = await api.post(API.USER.LOGOUT);

  return response.data;
};

// Change password
/* const changePassword = async (passwordData) => {
  const response = await api.patch(
    API.USER.CHANGE_PASSWORD,
    passwordData
  );

  return response.data;
}; */

// Update user account
const updateAccount = async (accountData) => {
  const response = await api.patch(
    API.USER.UPDATE_ACCOUNT,
    accountData
  );

  return response.data;
};

const userService = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  updateAccount,
};

export default userService;
