
import api from "../api/axios";

const BASE_URL = "/friends";

// Send friend request using user ID
const sendFriendRequestToUser = async (userId) => {
  const response = await api.post(`${BASE_URL}/invite`, {
    userId,
  });

  return response.data.data;
};

// Search users
const searchUsers = async (query) => {
  const response = await api.get(`${BASE_URL}/search`, {
    params: { query },
  });

  return response.data.data;
};

// Send friend request using invite code
const sendFriendRequest = async (inviteCode) => {
  const response = await api.post(`${BASE_URL}/invite`, {
    inviteCode,
  });

  return response.data.data;
};

// Get incoming requests
const getIncomingRequests = async () => {
  const response = await api.get(`${BASE_URL}/requests/incoming`);
  return response.data.data;
};

// Get outgoing requests
const getOutgoingRequests = async () => {
  const response = await api.get(`${BASE_URL}/requests/outgoing`);
  return response.data.data;
};

// Accept friend request
const acceptFriendRequest = async (requestId) => {
  const response = await api.patch(
    `${BASE_URL}/requests/${requestId}/accept`
  );

  return response.data.data;
};

// Reject friend request
const rejectFriendRequest = async (requestId) => {
  const response = await api.patch(
    `${BASE_URL}/requests/${requestId}/reject`
  );

  return response.data.data;
};

// Cancel friend request
const cancelFriendRequest = async (requestId) => {
  const response = await api.delete(
    `${BASE_URL}/requests/${requestId}`
  );

  return response.data.data;
};

// Get accepted friends
const getFriends = async () => {
  const response = await api.get(BASE_URL);
  return response.data.data;
};

// Remove friend
const removeFriend = async (friendId) => {
  const response = await api.delete(`${BASE_URL}/${friendId}`);
  return response.data.data;
};

// Get weekly comparison
const compareFriend = async (friendId) => {
  const response = await api.get(
    `${BASE_URL}/${friendId}/compare`
  );

  return response.data.data;
};

// Get Daily Duel history
const getDailyDuel = async (friendId, days = 7) => {
  const response = await api.get(
    `${BASE_URL}/${friendId}/daily-duel`,
    {
      params: { days },
    }
  );

  return response.data.data;
};

const friendService = {
  searchUsers,
  sendFriendRequest,
  getIncomingRequests,
  getOutgoingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getFriends,
  removeFriend,
  compareFriend,
  getDailyDuel,
  sendFriendRequestToUser,
};

export default friendService;
