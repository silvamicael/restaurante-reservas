// Testes de integração da API REAL (usa o PostgreSQL configurado em server/.env).
// Pré-requisito: `npm run db:setup` já executado e PostgreSQL ligado.
// Execute: npm run test:api
//
// Os testes criam reservas numa data bem distante (hoje + 700 dias), com e-mails
// únicos, e removem tudo o que criaram ao final. Os dados do seed não são tocados.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { pool } from '../src/config/database.js';

let servidor;
let base;
let cfg;
let bancoOk = false;
const criadas = [];
const rodada = Date.now();
let contador = 0;

const diasDepois = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const DATA_TESTE = diasDepois(700);

async function chamar(metodo, caminho, corpo) {
  const resposta = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
  let json = null;
  try {
    json = await resposta.json();
  } catch {
    /* sem corpo */
  }
  return { status: resposta.status, corpo: json };
}

function novaReserva(extra = {}) {
  contador += 1;
  return {
    nome: `Teste Integracao ${contador}`,
    email: `teste.${rodada}.${contador}@example.com`,
    data_reserva: DATA_TESTE,
    horario: '19:00',
    quantidade_pessoas: 2,
    observacoes: 'criada pelo teste automatizado',
    ...extra
  };
}

async function criar(extra) {
  const r = await chamar('POST', '/api/reservas', novaReserva(extra));
  if (r.status === 201) criadas.push(r.corpo.id);
  return r;
}

before(async () => {
  servidor = app.listen(0);
  await new Promise((ok) => servidor.once('listening', ok));
  base = `http://127.0.0.1:${servidor.address().port}`;
  const saude = await chamar('GET', '/api/health');
  bancoOk = saude.corpo?.banco === 'ok';
  if (!bancoOk) {
    console.error('\n>>> PostgreSQL indisponível. Rode "npm run db:setup" e confira o DATABASE_URL.\n');
  }
  cfg = (await chamar('GET', '/api/config')).corpo;
});

after(async () => {
  if (bancoOk && criadas.length) {
    const { rows } = await pool.query(
      'DELETE FROM reservas WHERE id = ANY($1::int[]) RETURNING cliente_id',
      [criadas]
    );
    const clientes = [...new Set(rows.map((r) => r.cliente_id))];
    await pool.query(
      `DELETE FROM clientes c
        WHERE c.id = ANY($1::int[])
          AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.cliente_id = c.id)`,
      [clientes]
    );
  }
  await new Promise((ok) => servidor.close(ok));
  await pool.end();
});

test('GET /api/health informa API e banco ativos', async () => {
  const r = await chamar('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.corpo.status, 'ok');
  assert.equal(r.corpo.banco, 'ok');
});

test('rota inexistente retorna 404 em JSON', async () => {
  const r = await chamar('GET', '/api/nao-existe');
  assert.equal(r.status, 404);
  assert.ok(r.corpo.erro);
});

test('criar reserva válida retorna 201 e ela aparece na listagem e na busca por id', async () => {
  const r = await criar({ nome: 'Cliente Valido Integracao' });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.status, 'pendente');
  assert.equal(r.corpo.data_reserva, DATA_TESTE);
  assert.equal(String(r.corpo.horario).slice(0, 5), '19:00');

  const lista = await chamar('GET', `/api/reservas?data=${DATA_TESTE}`);
  assert.equal(lista.status, 200);
  assert.ok(lista.corpo.some((x) => x.id === r.corpo.id));

  const unica = await chamar('GET', `/api/reservas/${r.corpo.id}`);
  assert.equal(unica.status, 200);
  assert.equal(unica.corpo.nome, 'Cliente Valido Integracao');
});

test('nome ou data vazios retornam 400 com mensagem clara', async () => {
  const semNome = await criar({ nome: '' });
  assert.equal(semNome.status, 400);
  assert.ok(semNome.corpo.detalhes.some((d) => d.campo === 'nome'));

  const semData = await criar({ data_reserva: '' });
  assert.equal(semData.status, 400);
  assert.ok(semData.corpo.detalhes.some((d) => d.campo === 'data_reserva'));
});

test('quantidade zero ou negativa retorna 400', async () => {
  assert.equal((await criar({ quantidade_pessoas: 0 })).status, 400);
  assert.equal((await criar({ quantidade_pessoas: -3 })).status, 400);
});

test('data/horário no passado retorna 400', async () => {
  const r = await criar({ data_reserva: '2020-01-01' });
  assert.equal(r.status, 400);
  assert.match(r.corpo.erro, /futuros/);
});

test('horário fora do funcionamento retorna 400', async () => {
  assert.equal((await criar({ horario: '03:00' })).status, 400);
  assert.equal((await criar({ horario: '19:10' })).status, 400);
});

test('sem telefone e sem e-mail retorna 400', async () => {
  const r = await chamar('POST', '/api/reservas', {
    nome: 'Sem Contato',
    data_reserva: DATA_TESTE,
    horario: '19:00',
    quantidade_pessoas: 2
  });
  assert.equal(r.status, 400);
});

test('JSON malformado retorna 400 (não 500)', async () => {
  const resposta = await fetch(`${base}/api/reservas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ isto nao e json'
  });
  assert.equal(resposta.status, 400);
});

test('capacidade: excedeu o limite do horário -> 409 e nada é gravado; cancelar libera vaga', async () => {
  const horario = '20:00';
  const porReserva = cfg.maxPessoasPorReserva;
  const aceitas = [];

  // Enche o horário até não caber mais uma reserva do tamanho máximo.
  let ocupadas = 0;
  while (ocupadas + porReserva <= cfg.maxPessoasPorHorario) {
    const r = await criar({ horario, quantidade_pessoas: porReserva });
    assert.equal(r.status, 201);
    aceitas.push(r.corpo.id);
    ocupadas += porReserva;
  }
  const antes = (await chamar('GET', `/api/reservas?data=${DATA_TESTE}`)).corpo.length;

  const bloqueada = await criar({ horario, quantidade_pessoas: cfg.maxPessoasPorHorario - ocupadas + 1 });
  assert.equal(bloqueada.status, 409);

  const depois = (await chamar('GET', `/api/reservas?data=${DATA_TESTE}`)).corpo.length;
  assert.equal(depois, antes, 'reserva rejeitada não pode ter sido gravada');

  // Cancelar uma reserva libera capacidade.
  const cancelada = await chamar('DELETE', `/api/reservas/${aceitas[0]}`);
  assert.equal(cancelada.status, 200);
  assert.equal(cancelada.corpo.status, 'cancelada');

  const nova = await criar({ horario, quantidade_pessoas: porReserva });
  assert.equal(nova.status, 201, 'após cancelar, o horário deve voltar a ter vaga');
});

test('concorrência: requisições simultâneas não ultrapassam a capacidade', async () => {
  const horario = '21:00';
  const porReserva = cfg.maxPessoasPorReserva;
  const maximoPossivel = Math.floor(cfg.maxPessoasPorHorario / porReserva);

  const respostas = await Promise.all(
    Array.from({ length: maximoPossivel + 3 }, () => criar({ horario, quantidade_pessoas: porReserva }))
  );
  const aceitas = respostas.filter((r) => r.status === 201).length;
  const recusadas = respostas.filter((r) => r.status === 409).length;

  assert.equal(aceitas, maximoPossivel);
  assert.equal(recusadas, respostas.length - maximoPossivel);

  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(quantidade_pessoas), 0)::int AS total FROM reservas
      WHERE data_reserva = $1 AND horario = $2 AND status IN ('pendente','confirmada')`,
    [DATA_TESTE, horario]
  );
  assert.ok(rows[0].total <= cfg.maxPessoasPorHorario);
});

test('pesquisa por nome e por data retorna só os resultados correspondentes', async () => {
  const unico = `Zyxwv${rodada}`;
  const r = await criar({ nome: unico, horario: '12:00' });
  assert.equal(r.status, 201);

  const porNome = await chamar('GET', `/api/reservas?nome=${unico.toLowerCase()}`);
  assert.equal(porNome.status, 200);
  assert.equal(porNome.corpo.length, 1);
  assert.equal(porNome.corpo[0].nome, unico);

  const porDataENome = await chamar('GET', `/api/reservas?nome=${unico}&data=${diasDepois(1)}`);
  assert.equal(porDataENome.corpo.length, 0);

  assert.equal((await chamar('GET', '/api/reservas?data=31-12-2030')).status, 400);
  assert.equal((await chamar('GET', '/api/reservas?status=xpto')).status, 400);
});

test('listagem vem ordenada por data e horário', async () => {
  const { corpo } = await chamar('GET', '/api/reservas');
  for (let i = 1; i < corpo.length; i++) {
    const a = `${corpo[i - 1].data_reserva} ${corpo[i - 1].horario}`;
    const b = `${corpo[i].data_reserva} ${corpo[i].horario}`;
    assert.ok(a <= b, `fora de ordem: ${a} antes de ${b}`);
  }
});

test('reserva/ID inexistente ou inválido: 404 e 400', async () => {
  assert.equal((await chamar('GET', '/api/reservas/99999999')).status, 404);
  assert.equal((await chamar('PUT', '/api/reservas/99999999', novaReserva())).status, 404);
  assert.equal((await chamar('PATCH', '/api/reservas/99999999/status', { status: 'confirmada' })).status, 404);
  assert.equal((await chamar('DELETE', '/api/reservas/99999999')).status, 404);
  assert.equal((await chamar('GET', '/api/reservas/abc')).status, 400);
});

test('editar reserva: atualiza os dados e revalida a disponibilidade', async () => {
  const r = await criar({ horario: '13:00', quantidade_pessoas: 2 });
  assert.equal(r.status, 201);

  const ok = await chamar('PUT', `/api/reservas/${r.corpo.id}`, {
    ...novaReserva({ nome: 'Nome Editado', email: r.corpo.email }),
    horario: '13:30',
    quantidade_pessoas: 5
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.corpo.nome, 'Nome Editado');
  assert.equal(String(ok.corpo.horario).slice(0, 5), '13:30');
  assert.equal(ok.corpo.quantidade_pessoas, 5);

  // Mover para data passada deve falhar.
  const passado = await chamar('PUT', `/api/reservas/${r.corpo.id}`, {
    ...novaReserva({ email: r.corpo.email }),
    data_reserva: '2020-01-01'
  });
  assert.equal(passado.status, 400);
});

test('status: confirmar, concluir; transição inválida retorna 409; status inválido retorna 400', async () => {
  const r = await criar({ horario: '14:00' });
  const id = r.corpo.id;

  const confirmada = await chamar('PATCH', `/api/reservas/${id}/status`, { status: 'confirmada' });
  assert.equal(confirmada.status, 200);
  assert.equal(confirmada.corpo.status, 'confirmada');

  const concluida = await chamar('PATCH', `/api/reservas/${id}/status`, { status: 'concluida' });
  assert.equal(concluida.status, 200);

  const invalida = await chamar('PATCH', `/api/reservas/${id}/status`, { status: 'confirmada' });
  assert.equal(invalida.status, 409);

  assert.equal((await chamar('PATCH', `/api/reservas/${id}/status`, { status: 'xpto' })).status, 400);
  assert.equal((await chamar('PATCH', `/api/reservas/${id}/status`, {})).status, 400);

  // Reserva concluída não pode ser editada.
  const edicao = await chamar('PUT', `/api/reservas/${id}`, novaReserva({ email: r.corpo.email }));
  assert.equal(edicao.status, 409);
});

test('reativar reserva cancelada revalida a capacidade', async () => {
  const r = await criar({ horario: '15:00' });
  await chamar('DELETE', `/api/reservas/${r.corpo.id}`);
  const reativada = await chamar('PATCH', `/api/reservas/${r.corpo.id}/status`, { status: 'pendente' });
  assert.equal(reativada.status, 200);
  assert.equal(reativada.corpo.status, 'pendente');
});
