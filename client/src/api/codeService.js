import api from './axios.js';
import { runJavaScriptInBrowser } from '../utils/javascriptRunner.js';

const codeService = {
  async runtimes() {
    const response = await api.get('/code/runtimes');
    return response.data;
  },

  async run(data) {
    if (data?.language === 'javascript') {
      return runJavaScriptInBrowser(data);
    }

    return this.runRemote(data);
  },

  async runRemote(data) {
    const response = await api.post('/code/run', data);
    return response.data;
  },
};

export default codeService;
