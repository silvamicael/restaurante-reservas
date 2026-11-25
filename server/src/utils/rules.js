// Regras de negócio PURAS (sem banco e sem Express), fáceis de testar.
// Recebem a configuração (`cfg`) por parâmetro.

export const STATUS = ['pendente', 'confirmada', 'cancelada', 'concluida'];

// Somente reservas nesses estados bloqueiam capacidade do horário.
export const STATUS_QUE_OCUPAM = ['pendente', 'confirmada'];

// Transições de status permitidas. Uma reserva cancelada só volta
// por uma ação explícita de reativação (cancelada -> pendente).
export const TRANSICOES = {
  pendente: ['confirmada', 'cancelada'],
  confirmada: ['concluida', 'cancelada'],
  cancelada: ['pendente'],
  concluida: []
};

export function transicaoPermitida(de, para) {
  return (TRANSICOES[de] || []).includes(para);
}

export function horaParaMinutos(hora) {
  const [h, m] = String(hora).slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

export function minutosParaHora(minutos) {
  const h = String(Math.floor(minutos / 60)).padStart(2, '0');
  const m = String(minutos % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** Confere se 'AAAA-MM-DD' é uma data real do calendário (rejeita 2026-02-30). */
export function dataEhValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

/** Lista os horários de reserva do dia (ex.: 11:00, 11:30, ..., 22:00). */
export function gerarHorarios(cfg) {
  const inicio = horaParaMinutos(cfg.horarioAbertura);
  const fim = horaParaMinutos(cfg.horarioUltimaReserva);
  const passo = cfg.intervaloMinutos;
  const lista = [];
  for (let m = inicio; m <= fim; m += passo) lista.push(minutosParaHora(m));
  return lista;
}

/** O horário está dentro do funcionamento e alinhado ao intervalo (ex.: de 30 em 30 min)? */
export function horarioDentroDoFuncionamento(horario, cfg) {
  const m = horaParaMinutos(horario);
  const inicio = horaParaMinutos(cfg.horarioAbertura);
  const fim = horaParaMinutos(cfg.horarioUltimaReserva);
  return m >= inicio && m <= fim && (m - inicio) % cfg.intervaloMinutos === 0;
}

/** Data e hora atuais no fuso do restaurante: { data: 'AAAA-MM-DD', minutos: number }. */
export function agoraNoFuso(fuso, referencia = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(referencia);
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    minutos: (Number(p.hour) % 24) * 60 + Number(p.minute)
  };
}

/** A data/hora informada já passou (ou é exatamente agora)? */
export function dataHoraNoPassado(data, horario, agora) {
  if (data < agora.data) return true;
  if (data > agora.data) return false;
  return horaParaMinutos(horario) <= agora.minutos;
}

/** A soma de pessoas (já ocupadas + solicitadas) ultrapassa o limite do horário? */
export function capacidadeExcedida(ocupadas, solicitadas, limite) {
  return ocupadas + solicitadas > limite;
}
