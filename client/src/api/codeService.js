import api from './axios.js';
import { runJavaScriptInBrowser } from '../utils/javascriptRunner.js';

function createUnsupportedRunnerError(language) {
  const error = new Error('Code runner unavailable');
  error.response = {
    status: 503,
    data: {
      message: `${language} execution is temporarily unavailable while the hosted code runner is pending access.`,
    },
  };

  return error;
}

const codeService = {
  async runtimes() {
    const response = await api.get('/code/runtimes');
    return response.data;
  },

  async run(data) {
    if (data?.language === 'javascript') {
      return runJavaScriptInBrowser(data);
    }

    throw createUnsupportedRunnerError(data?.language ?? 'This language');
  },

  async runRemote(data) {
    const response = await api.post('/code/run', data);
    return response.data;
  },
};

export default codeService;
