/** Erro de negócio/validação que vira resposta HTTP com o status informado. */
export class HttpError extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.name = 'HttpError';
    this.status = status;
    this.detalhes = detalhes;
  }
}

export const erroRequisicao = (msg, detalhes) => new HttpError(400, msg, detalhes);
export const naoEncontrado = (msg) => new HttpError(404, msg);
export const conflito = (msg) => new HttpError(409, msg);
