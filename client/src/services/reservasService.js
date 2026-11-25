import api from './api';

export const obterConfiguracao = () => api.get('/config');

export const listarReservas = (filtros = {}) => api.get('/reservas', { params: filtros });

export const criarReserva = (dados) => api.post('/reservas', dados);

export const atualizarReserva = (id, dados) => api.put(`/reservas/${id}`, dados);

export const atualizarStatusReserva = (id, status) =>
  api.patch(`/reservas/${id}/status`, { status });

export const cancelarReserva = (id) => api.delete(`/reservas/${id}`);
