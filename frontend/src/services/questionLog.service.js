
import api from "../api/axios";

const BASE_URL = "/questions";

// Fetch question tracker configuration (NEET / CSE metrics)
const getConfig = async () => {
  const response = await api.get(`${BASE_URL}/config`);
  return response.data.data;
};

// Fetch all question logs
const getLogs = async (filters = {}) => {
  const response = await api.get(`${BASE_URL}/logs`, {
    params: filters,
  });

  return response.data.data;
};

// Fetch a specific question log
const getLogById = async (logId) => {
  const response = await api.get(`${BASE_URL}/logs/${logId}`);
  return response.data.data;
};

// Fetch daily question summary
const getDailySummary = async (date) => {
  const response = await api.get(`${BASE_URL}/daily-summary`, {
    params: date ? { date } : {},
  });

  return response.data.data;
};

// Fetch weekly question summary
const getWeeklySummary = async () => {
  const response = await api.get(`${BASE_URL}/weekly-summary`);
  return response.data.data;
};

// Create or update a daily question log
const saveDailyLog = async (logData) => {
  const response = await api.post(`${BASE_URL}/logs`, logData);
  return response.data.data;
};

// Delete a question log
const deleteLog = async (logId) => {
  const response = await api.delete(`${BASE_URL}/logs/${logId}`);
  return response.data.data;
};

const questionLogService = {
  getConfig,
  getLogs,
  getLogById,
  getDailySummary,
  getWeeklySummary,
  saveDailyLog,
  deleteLog,
};

export default questionLogService;
