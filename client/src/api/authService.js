import api from './axios.js';

const authService = {
  async register(data) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(data) {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async me() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.patch('/auth/me', data);
    return response.data;
  },

  async changePassword(data) {
    const response = await api.patch('/auth/password', data);
    return response.data;
  },

  async deleteAccount(data) {
    const response = await api.delete('/auth/me', { data });
    return response.data;
  },
};

export default authService;
