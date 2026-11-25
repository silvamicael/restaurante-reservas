import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000
});

export default api;

/** Converte um erro do Axios em texto compreensível para o usuário. */
export function mensagemDeErro(error, padrao = 'Ocorreu um erro inesperado.') {
  if (error.response) {
    const { erro, detalhes } = error.response.data || {};
    if (Array.isArray(detalhes) && detalhes.length) {
      return detalhes.map((d) => d.mensagem).join(' ');
    }
    return erro || padrao;
  }
  if (error.code === 'ECONNABORTED') {
    return 'A API demorou demais para responder. Tente novamente.';
  }
  if (error.request) {
    return 'Não foi possível conectar à API. Verifique se o servidor está em execução.';
  }
  return padrao;
}

/** Extrai erros por campo ({ campo: mensagem }) quando a API devolve "detalhes". */
export function errosPorCampo(error) {
  const detalhes = error.response?.data?.detalhes;
  if (!Array.isArray(detalhes)) return {};
  return Object.fromEntries(detalhes.map((d) => [d.campo, d.mensagem]));
}
