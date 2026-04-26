import api from './axios.js';

const codeService = {
  async runtimes() {
    const response = await api.get('/code/runtimes');
    return response.data;
  },

  async run(data) {
    const response = await api.post('/code/run', data);
    return response.data;
  },
};

export default codeService;
