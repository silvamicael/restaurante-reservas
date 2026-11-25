import 'dotenv/config';

function numero(valor, padrao) {
  if (valor === undefined || valor === '') return padrao;
  const n = Number(valor);
  return Number.isFinite(n) ? n : padrao;
}

export const config = {
  port: numero(process.env.PORT, 3001),
  databaseUrl: process.env.DATABASE_URL,
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // Regras de negócio do restaurante
  maxPessoasPorHorario: numero(process.env.MAX_PESSOAS_POR_HORARIO, 30),
  maxPessoasPorReserva: numero(process.env.MAX_PESSOAS_POR_RESERVA, 12),
  horarioAbertura: process.env.HORARIO_ABERTURA || '11:00',
  horarioUltimaReserva: process.env.HORARIO_ULTIMA_RESERVA || '22:00',
  intervaloMinutos: numero(process.env.INTERVALO_MINUTOS, 30),
  fusoHorario: process.env.FUSO_HORARIO || 'America/Sao_Paulo'
};
