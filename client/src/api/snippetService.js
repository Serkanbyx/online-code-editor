import api from './axios.js';

const snippetService = {
  async create(data) {
    const response = await api.post('/snippets', data);
    return response.data;
  },

  async getMy(params) {
    const response = await api.get('/snippets/me', { params });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(`/snippets/${id}`);
    return response.data;
  },

  async update(id, data) {
    const response = await api.patch(`/snippets/${id}`, data);
    return response.data;
  },

  async remove(id) {
    const response = await api.delete(`/snippets/${id}`);
    return response.data;
  },

  async getPublic(params) {
    const response = await api.get('/snippets/public', { params });
    return response.data;
  },

  async fork(id) {
    const response = await api.post(`/snippets/${id}/fork`);
    return response.data;
  },
};

export default snippetService;
