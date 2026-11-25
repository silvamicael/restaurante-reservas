/** 'AAAA-MM-DD' -> 'DD/MM/AAAA' (sem usar Date, para evitar problemas de fuso horário). */
export function formatarData(texto) {
  if (!texto) return '';
  const [ano, mes, dia] = String(texto).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** 'HH:MM:SS' -> 'HH:MM' */
export const formatarHorario = (texto) => String(texto || '').slice(0, 5);

/** Data de hoje no formato AAAA-MM-DD, no fuso do navegador. */
export function hojeISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export const ROTULOS_STATUS = {
  pendente: 'Pendente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  concluida: 'Concluída'
};

/** Horários padrão usados caso a API de configuração não responda. */
export function gerarHorariosPadrao() {
  const lista = [];
  for (let minutos = 11 * 60; minutos <= 22 * 60; minutos += 30) {
    const h = String(Math.floor(minutos / 60)).padStart(2, '0');
    const m = String(minutos % 60).padStart(2, '0');
    lista.push(`${h}:${m}`);
  }
  return lista;
}
