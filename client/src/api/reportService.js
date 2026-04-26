import api from './axios.js';

const reportService = {
  async create(data) {
    const response = await api.post('/reports', data);
    return response.data;
  },

  async getMy(params) {
    const response = await api.get('/reports/me', { params });
    return response.data;
  },
};

export default reportService;
