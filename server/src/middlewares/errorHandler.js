import { HttpError } from '../utils/httpError.js';

export function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (error instanceof HttpError) {
    const corpo = { erro: error.message };
    if (error.detalhes) corpo.detalhes = error.detalhes;
    return res.status(error.status).json(corpo);
  }

  // JSON malformado enviado pelo cliente
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Corpo da requisição muito grande.' });
  }

  // Erro inesperado: registra só a mensagem no servidor e devolve texto genérico ao cliente
  // (nunca devolve detalhes do banco, variáveis de ambiente ou stack trace).
  console.error('Erro inesperado:', error.message);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}
