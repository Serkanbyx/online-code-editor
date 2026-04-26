import api from './axios.js';

const likeService = {
  async toggle(snippetId) {
    const response = await api.post(`/likes/${snippetId}`);
    return response.data;
  },

  async myLikes(params) {
    const response = await api.get('/likes/me', { params });
    return response.data;
  },

  async hasLiked(snippetId) {
    const response = await api.get(`/likes/${snippetId}/me`);
    return response.data;
  },
};

export default likeService;
