import api from './axios.js';

const adminService = {
  async getStats() {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  async listUsers(params) {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  async getUserById(id) {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  async updateUserRole(id, data) {
    const response = await api.patch(`/admin/users/${id}/role`, data);
    return response.data;
  },

  async banUser(id, data) {
    const response = await api.patch(`/admin/users/${id}/ban`, data);
    return response.data;
  },

  async deleteUser(id) {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  async listSnippets(params) {
    const response = await api.get('/admin/snippets', { params });
    return response.data;
  },

  async moderateSnippet(id, data) {
    const response = await api.patch(`/admin/snippets/${id}/status`, data);
    return response.data;
  },

  async deleteSnippet(id) {
    const response = await api.delete(`/admin/snippets/${id}`);
    return response.data;
  },

  async listComments(params) {
    const response = await api.get('/admin/comments', { params });
    return response.data;
  },

  async moderateComment(id, data) {
    const response = await api.patch(`/admin/comments/${id}/status`, data);
    return response.data;
  },

  async listReports(params) {
    const response = await api.get('/admin/reports', { params });
    return response.data;
  },

  async resolveReport(id, data) {
    const response = await api.patch(`/admin/reports/${id}`, data);
    return response.data;
  },
};

export default adminService;
