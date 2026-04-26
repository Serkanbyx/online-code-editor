import api from './axios.js';

const uploadService = {
  async avatar(formData) {
    const response = await api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default uploadService;
