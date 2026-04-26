import api from './axios.js';

const roomService = {
  async create(data) {
    const response = await api.post('/rooms', data);
    return response.data;
  },

  async getMy(params) {
    const response = await api.get('/rooms/me', { params });
    return response.data;
  },

  async getById(roomId) {
    const response = await api.get(`/rooms/${roomId}`);
    return response.data;
  },

  async join(roomId) {
    const response = await api.post(`/rooms/${roomId}/join`);
    return response.data;
  },

  async leave(roomId) {
    const response = await api.post(`/rooms/${roomId}/leave`);
    return response.data;
  },

  async update(roomId, data) {
    const response = await api.patch(`/rooms/${roomId}`, data);
    return response.data;
  },

  async remove(roomId) {
    const response = await api.delete(`/rooms/${roomId}`);
    return response.data;
  },

  async addParticipant(roomId, username) {
    const response = await api.post(`/rooms/${roomId}/participants`, { username });
    return response.data;
  },
};

export default roomService;
