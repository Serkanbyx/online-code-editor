import api from './axios.js';

const commentService = {
  async listForSnippet(snippetId, params) {
    const response = await api.get(`/comments/snippet/${snippetId}`, { params });
    return response.data;
  },

  async listReplies(commentId, params) {
    const response = await api.get(`/comments/${commentId}/replies`, { params });
    return response.data;
  },

  async create(data) {
    const response = await api.post('/comments', data);
    return response.data;
  },

  async update(id, data) {
    const response = await api.patch(`/comments/${id}`, data);
    return response.data;
  },

  async remove(id) {
    const response = await api.delete(`/comments/${id}`);
    return response.data;
  },
};

export default commentService;
