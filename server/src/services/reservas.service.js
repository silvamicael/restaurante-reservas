import { config } from '../config/env.js';
import { comTransacao, pool } from '../config/database.js';
import * as repo from '../repositories/reservas.repository.js';
import { criarReservaSchema, normalizarCorpo } from '../schemas/reserva.schema.js';
import { conflito, erroRequisicao, naoEncontrado } from '../utils/httpError.js';
import {
  STATUS,
  agoraNoFuso,
  capacidadeExcedida,
  dataEhValida,
  dataHoraNoPassado,
  gerarHorarios,
  horarioDentroDoFuncionamento,
  transicaoPermitida
} from '../utils/rules.js';

const schema = criarReservaSchema(config);

// ---------------------------------------------------------------- helpers

function interpretarId(valor) {
  if (!/^\d+$/.test(String(valor)) || Number(valor) < 1 || Number(valor) > 2147483647) {
    throw erroRequisicao('Identificador inválido.');
  }
  return Number(valor);
}

function validarCorpo(corpo) {
  const resultado = schema.safeParse(normalizarCorpo(corpo));
  if (!resultado.success) {
    throw erroRequisicao(
      'Dados inválidos.',
      resultado.error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message }))
    );
  }
  return resultado.data;
}

function validarDataEHorario(data, horario) {
  if (!horarioDentroDoFuncionamento(horario, config)) {
    throw erroRequisicao(
      `Horário fora do funcionamento. Reservas entre ${config.horarioAbertura} e ` +
        `${config.horarioUltimaReserva}, a cada ${config.intervaloMinutos} minutos.`
    );
  }
  if (dataHoraNoPassado(data, horario, agoraNoFuso(config.fusoHorario))) {
    throw erroRequisicao('Informe uma data e horário futuros.');
  }
}

/** Dentro da transação: trava o horário e confere se cabem `pessoas` a mais. */
async function garantirCapacidade(client, data, horario, pessoas, ignorarId = null) {
  await repo.travarHorario(client, data, horario);
  const ocupadas = await repo.somarOcupacao(client, data, horario, { ignorarId });
  if (capacidadeExcedida(ocupadas, pessoas, config.maxPessoasPorHorario)) {
    const livres = Math.max(config.maxPessoasPorHorario - ocupadas, 0);
    throw conflito(
      livres === 0
        ? 'Não há capacidade disponível nesse horário.'
        : `Capacidade insuficiente nesse horário: restam ${livres} lugar(es).`
    );
  }
}

/**
 * Política de identificação do cliente:
 *  - com e-mail: reaproveita o cliente que tem o mesmo e-mail (sem diferenciar maiúsculas);
 *  - sem e-mail: reaproveita o cliente com o mesmo telefone (comparando só os dígitos);
 *  - caso contrário, cria um novo cliente.
 * Quando reaproveita, atualiza o nome e completa telefone/e-mail se vieram preenchidos.
 */
async function resolverCliente(client, { nome, telefone, email }) {
  let existente = null;
  if (email) {
    existente = await repo.buscarClientePorEmail(client, email);
  } else if (telefone) {
    const digitos = telefone.replace(/\D/g, '');
    if (digitos) existente = await repo.buscarClientePorTelefone(client, digitos);
  }
  if (existente) {
    await repo.atualizarCliente(client, existente.id, { nome, telefone, email });
    return existente.id;
  }
  const novo = await repo.inserirCliente(client, { nome, telefone, email });
  return novo.id;
}

// ---------------------------------------------------------------- casos de uso

export function obterConfiguracao() {
  return {
    maxPessoasPorReserva: config.maxPessoasPorReserva,
    maxPessoasPorHorario: config.maxPessoasPorHorario,
    horarioAbertura: config.horarioAbertura,
    horarioUltimaReserva: config.horarioUltimaReserva,
    intervaloMinutos: config.intervaloMinutos,
    fusoHorario: config.fusoHorario,
    horarios: gerarHorarios(config)
  };
}

export async function listar(query) {
  const filtros = {};

  if (query.data !== undefined && query.data !== '') {
    if (!dataEhValida(query.data)) {
      throw erroRequisicao('Data inválida. Use o formato AAAA-MM-DD.');
    }
    filtros.data = query.data;
  }
  if (query.status !== undefined && query.status !== '') {
    if (!STATUS.includes(query.status)) throw erroRequisicao('Status inválido.');
    filtros.status = query.status;
  }
  if (typeof query.nome === 'string' && query.nome.trim() !== '') {
    if (query.nome.trim().length > 120) throw erroRequisicao('O nome pesquisado é muito longo.');
    filtros.nome = query.nome.trim();
  }
  return repo.listar(pool, filtros);
}

export async function buscar(idBruto) {
  const id = interpretarId(idBruto);
  const reserva = await repo.buscarPorId(pool, id);
  if (!reserva) throw naoEncontrado('Reserva não encontrada.');
  return reserva;
}

export async function criar(corpo) {
  const dados = validarCorpo(corpo);
  validarDataEHorario(dados.data_reserva, dados.horario);

  return comTransacao(async (client) => {
    await garantirCapacidade(client, dados.data_reserva, dados.horario, dados.quantidade_pessoas);
    const clienteId = await resolverCliente(client, dados);
    const { id } = await repo.inserirReserva(client, { ...dados, cliente_id: clienteId });
    return repo.buscarPorId(client, id);
  });
}

export async function atualizar(idBruto, corpo) {
  const id = interpretarId(idBruto);
  const dados = validarCorpo(corpo);

  return comTransacao(async (client) => {
    const atual = await repo.buscarPorId(client, id, { travar: true });
    if (!atual) throw naoEncontrado('Reserva não encontrada.');
    if (!['pendente', 'confirmada'].includes(atual.status)) {
      throw conflito('Reservas canceladas ou concluídas não podem ser editadas.');
    }

    const horarioAtual = String(atual.horario).slice(0, 5);
    const mudouAgenda =
      dados.data_reserva !== atual.data_reserva ||
      dados.horario !== horarioAtual ||
      dados.quantidade_pessoas !== atual.quantidade_pessoas;

    // Mudou data, horário ou quantidade: revalida horário, passado e disponibilidade.
    if (mudouAgenda) {
      validarDataEHorario(dados.data_reserva, dados.horario);
      await garantirCapacidade(client, dados.data_reserva, dados.horario, dados.quantidade_pessoas, id);
    }

    const clienteId = await resolverCliente(client, dados);
    await repo.atualizarReserva(client, id, { ...dados, cliente_id: clienteId });
    return repo.buscarPorId(client, id);
  });
}

export async function alterarStatus(idBruto, status) {
  const id = interpretarId(idBruto);
  if (!STATUS.includes(status)) {
    throw erroRequisicao(`Status inválido. Use: ${STATUS.join(', ')}.`);
  }

  return comTransacao(async (client) => {
    const atual = await repo.buscarPorId(client, id, { travar: true });
    if (!atual) throw naoEncontrado('Reserva não encontrada.');

    if (atual.status === status) return atual; // nada a fazer (operação idempotente)

    if (!transicaoPermitida(atual.status, status)) {
      throw conflito(`Não é possível mudar o status de "${atual.status}" para "${status}".`);
    }

    // Reativar (cancelada -> pendente) volta a ocupar lugares: revalida tudo.
    if (atual.status === 'cancelada') {
      const horario = String(atual.horario).slice(0, 5);
      if (dataHoraNoPassado(atual.data_reserva, horario, agoraNoFuso(config.fusoHorario))) {
        throw conflito('Não é possível reativar uma reserva cuja data e horário já passaram.');
      }
      await garantirCapacidade(client, atual.data_reserva, horario, atual.quantidade_pessoas, id);
    }

    await repo.atualizarStatus(client, id, status);
    return repo.buscarPorId(client, id);
  });
}

export const cancelar = (id) => alterarStatus(id, 'cancelada');

export async function verificarBanco() {
  try {
    await pool.query('SELECT 1');
    return 'ok';
  } catch {
    return 'indisponivel';
  }
}
