
import api from "../api/axios";

const BASE_URL = "/planner";

// Create task
const createTask = async (taskData) => {
  const response = await api.post(`${BASE_URL}/tasks`, taskData);
  return response.data.data;
};

// Fetch tasks
const getTasks = async (filters = {}) => {
  const response = await api.get(`${BASE_URL}/tasks`, {
    params: filters,
  });

  return response.data.data;
};

// Fetch one task
const getTaskById = async (taskId) => {
  const response = await api.get(`${BASE_URL}/tasks/${taskId}`);
  return response.data.data;
};

// Update task details
const updateTask = async (taskId, taskData) => {
  const response = await api.patch(
    `${BASE_URL}/tasks/${taskId}`,
    taskData
  );

  return response.data.data;
};

// Complete or reopen task
const updateTaskStatus = async (taskId, status) => {
  const response = await api.patch(
    `${BASE_URL}/tasks/${taskId}/status`,
    { status }
  );

  return response.data.data;
};

// Delete task
const deleteTask = async (taskId) => {
  const response = await api.delete(`${BASE_URL}/tasks/${taskId}`);
  return response.data.data;
};

// Fetch progress for a selected week
const getWeeklyProgress = async (weekStart) => {
  const response = await api.get(`${BASE_URL}/weekly-progress`, {
    params: weekStart ? { weekStart } : {},
  });

  return response.data.data;
};

// Update weekly target
const updateWeeklyTarget = async (weeklyTargetHours) => {
  const response = await api.patch(`${BASE_URL}/weekly-target`, {
    weeklyTargetHours,
  });

  return response.data.data;
};

const plannerService = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getWeeklyProgress,
  updateWeeklyTarget,
};

export default plannerService;
