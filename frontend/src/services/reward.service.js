
import api from "../api/axios";

const getData = (response) => response.data.data;

const rewardService = {
  async getRewards() {
    const response = await api.get("/rewards");
    return getData(response);
  },

  async getRewardProgress() {
    const response = await api.get("/rewards/progress");
    return getData(response);
  },
};

export default rewardService;
