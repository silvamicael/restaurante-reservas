// Testes unitários das regras de negócio e da validação (não precisam de banco).
// Execute: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agoraNoFuso,
  capacidadeExcedida,
  dataEhValida,
  dataHoraNoPassado,
  gerarHorarios,
  horarioDentroDoFuncionamento,
  transicaoPermitida
} from '../src/utils/rules.js';
import { criarReservaSchema, normalizarCorpo } from '../src/schemas/reserva.schema.js';

const cfg = {
  horarioAbertura: '11:00',
  horarioUltimaReserva: '22:00',
  intervaloMinutos: 30,
  maxPessoasPorReserva: 12
};
const schema = criarReservaSchema(cfg);

const valido = {
  nome: 'João Martins',
  telefone: '(48) 99944-5566',
  email: 'joao@example.com',
  data_reserva: '2030-01-15',
  horario: '19:30',
  quantidade_pessoas: 4,
  observacoes: 'Área externa'
};
const validar = (corpo) => schema.safeParse(normalizarCorpo(corpo));
const camposComErro = (r) => r.error.issues.map((i) => i.path.join('.'));

test('dataEhValida aceita datas reais e rejeita inexistentes', () => {
  assert.equal(dataEhValida('2028-02-29'), true); // ano bissexto
  assert.equal(dataEhValida('2027-02-29'), false);
  assert.equal(dataEhValida('2026-02-30'), false);
  assert.equal(dataEhValida('2026-13-01'), false);
  assert.equal(dataEhValida('15/01/2027'), false);
  assert.equal(dataEhValida(''), false);
  assert.equal(dataEhValida(undefined), false);
});

test('gerarHorarios cria a grade de 30 em 30 minutos', () => {
  const h = gerarHorarios(cfg);
  assert.equal(h[0], '11:00');
  assert.equal(h[1], '11:30');
  assert.equal(h.at(-1), '22:00');
  assert.equal(h.length, 23);
});

test('horarioDentroDoFuncionamento respeita abertura, última reserva e intervalo', () => {
  assert.equal(horarioDentroDoFuncionamento('11:00', cfg), true);
  assert.equal(horarioDentroDoFuncionamento('22:00', cfg), true);
  assert.equal(horarioDentroDoFuncionamento('10:30', cfg), false);
  assert.equal(horarioDentroDoFuncionamento('22:30', cfg), false);
  assert.equal(horarioDentroDoFuncionamento('19:15', cfg), false);
  assert.equal(horarioDentroDoFuncionamento('19:30:00', cfg), true); // formato TIME do PostgreSQL
});

test('dataHoraNoPassado compara data e horário', () => {
  const agora = { data: '2026-11-25', minutos: 15 * 60 };
  assert.equal(dataHoraNoPassado('2026-11-24', '20:00', agora), true);
  assert.equal(dataHoraNoPassado('2026-11-25', '14:30', agora), true);
  assert.equal(dataHoraNoPassado('2026-11-25', '15:00', agora), true); // exatamente agora
  assert.equal(dataHoraNoPassado('2026-11-25', '15:30', agora), false);
  assert.equal(dataHoraNoPassado('2026-11-26', '11:00', agora), false);
});

test('agoraNoFuso devolve data e minutos no formato esperado', () => {
  // 2026-11-25 02:30 UTC = 2026-11-24 23:30 em São Paulo (UTC-3)
  const r = agoraNoFuso('America/Sao_Paulo', new Date('2026-11-25T02:30:00Z'));
  assert.deepEqual(r, { data: '2026-11-24', minutos: 23 * 60 + 30 });
  // meia-noite não pode virar "24:00"
  const meia = agoraNoFuso('America/Sao_Paulo', new Date('2026-11-25T03:05:00Z'));
  assert.deepEqual(meia, { data: '2026-11-25', minutos: 5 });
});

test('capacidadeExcedida: o limite exato ainda cabe', () => {
  assert.equal(capacidadeExcedida(26, 4, 30), false);
  assert.equal(capacidadeExcedida(26, 5, 30), true);
  assert.equal(capacidadeExcedida(0, 30, 30), false);
  assert.equal(capacidadeExcedida(30, 1, 30), true);
});

test('transições de status', () => {
  assert.equal(transicaoPermitida('pendente', 'confirmada'), true);
  assert.equal(transicaoPermitida('pendente', 'cancelada'), true);
  assert.equal(transicaoPermitida('confirmada', 'concluida'), true);
  assert.equal(transicaoPermitida('cancelada', 'pendente'), true); // reativação explícita
  assert.equal(transicaoPermitida('cancelada', 'confirmada'), false);
  assert.equal(transicaoPermitida('concluida', 'cancelada'), false);
  assert.equal(transicaoPermitida('pendente', 'concluida'), false);
  assert.equal(transicaoPermitida('inexistente', 'pendente'), false);
});

test('schema aceita uma reserva válida', () => {
  const r = validar(valido);
  assert.equal(r.success, true);
  assert.equal(r.data.nome, 'João Martins');
  assert.equal(r.data.quantidade_pessoas, 4);
});

test('schema aceita quantidade enviada como texto e apara espaços', () => {
  const r = validar({ ...valido, nome: '  Ana Paula  ', quantidade_pessoas: ' 3 ' });
  assert.equal(r.success, true);
  assert.equal(r.data.nome, 'Ana Paula');
  assert.equal(r.data.quantidade_pessoas, 3);
});

test('schema rejeita nome vazio ou ausente', () => {
  for (const nome of ['', '   ', undefined, null, 'A']) {
    const r = validar({ ...valido, nome });
    assert.equal(r.success, false);
    assert.ok(camposComErro(r).includes('nome'));
  }
});

test('schema rejeita quantidade zero, negativa, decimal, texto e acima do limite', () => {
  for (const q of [0, -1, 2.5, 'abc', '', null, undefined, 13]) {
    const r = validar({ ...valido, quantidade_pessoas: q });
    assert.equal(r.success, false, `quantidade ${String(q)} deveria ser rejeitada`);
    assert.ok(camposComErro(r).includes('quantidade_pessoas'));
  }
  assert.equal(validar({ ...valido, quantidade_pessoas: 12 }).success, true);
  assert.equal(validar({ ...valido, quantidade_pessoas: 1 }).success, true);
});

test('schema rejeita data/horário em formato ou valor inválido', () => {
  assert.equal(validar({ ...valido, data_reserva: '' }).success, false);
  assert.equal(validar({ ...valido, data_reserva: '2030-02-31' }).success, false);
  assert.equal(validar({ ...valido, data_reserva: '15/01/2030' }).success, false);
  assert.equal(validar({ ...valido, horario: '25:00' }).success, false);
  assert.equal(validar({ ...valido, horario: '7:30' }).success, false);
  assert.equal(validar({ ...valido, horario: '' }).success, false);
});

test('schema exige telefone OU e-mail', () => {
  const nenhum = validar({ ...valido, telefone: '', email: '' });
  assert.equal(nenhum.success, false);
  assert.ok(camposComErro(nenhum).includes('telefone'));
  assert.equal(validar({ ...valido, telefone: '', email: 'a@b.com' }).success, true);
  assert.equal(validar({ ...valido, telefone: '(48) 99911-2233', email: '' }).success, true);
});

test('schema rejeita e-mail e telefone malformados', () => {
  assert.equal(validar({ ...valido, email: 'sem-arroba' }).success, false);
  assert.equal(validar({ ...valido, telefone: 'abc' }).success, false);
  assert.equal(validar({ ...valido, telefone: '123' }).success, false);
});

test('schema limita observações a 500 caracteres', () => {
  assert.equal(validar({ ...valido, observacoes: 'x'.repeat(500) }).success, true);
  assert.equal(validar({ ...valido, observacoes: 'x'.repeat(501) }).success, false);
});

test('schema descarta campos desconhecidos (ex.: status não pode ser definido na criação)', () => {
  const r = validar({ ...valido, status: 'confirmada', id: 99 });
  assert.equal(r.success, true);
  assert.equal('status' in r.data, false);
  assert.equal('id' in r.data, false);
});

test('corpo inválido (null, array, texto) vira lista de erros e não quebra', () => {
  for (const corpo of [null, undefined, [], 'texto', 42]) {
    assert.equal(validar(corpo).success, false);
  }
});
