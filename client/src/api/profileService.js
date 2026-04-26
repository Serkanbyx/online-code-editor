import api from './axios.js';

const profileService = {
  async getPublic(username) {
    const response = await api.get(`/profile/${username}`);
    return response.data;
  },

  async getSnippets(username, params) {
    const response = await api.get(`/profile/${username}/snippets`, { params });
    return response.data;
  },

  async getLikes(username, params) {
    const response = await api.get(`/profile/${username}/likes`, { params });
    return response.data;
  },

  async getComments(username, params) {
    const response = await api.get(`/profile/${username}/comments`, { params });
    return response.data;
  },

  async updatePreferences(data) {
    const response = await api.patch('/profile/me/preferences', data);
    return response.data;
  },
};

export default profileService;
