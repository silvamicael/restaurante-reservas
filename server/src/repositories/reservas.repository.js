// Acesso ao banco. TODAS as consultas usam parâmetros ($1, $2...) - nunca concatenam dados do usuário.
// Cada função recebe `db`, que pode ser o pool ou um client dentro de uma transação.

const COLUNAS = `
  r.id, r.cliente_id, c.nome, c.telefone, c.email,
  r.data_reserva, r.horario, r.quantidade_pessoas,
  r.status, r.observacoes, r.criado_em, r.atualizado_em
`;

export async function listar(db, { data, nome, status }) {
  const filtros = [];
  const valores = [];

  if (data) {
    valores.push(data);
    filtros.push(`r.data_reserva = $${valores.length}::date`);
  }
  if (nome) {
    // Escapa % e _ digitados pelo usuário para que sejam tratados como texto comum.
    valores.push(`%${nome.replace(/[\\%_]/g, '\\$&')}%`);
    filtros.push(`c.nome ILIKE $${valores.length}`);
  }
  if (status) {
    valores.push(status);
    filtros.push(`r.status = $${valores.length}`);
  }

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
  const resultado = await db.query(
    `SELECT ${COLUNAS}
       FROM reservas r
       JOIN clientes c ON c.id = r.cliente_id
       ${where}
      ORDER BY r.data_reserva, r.horario, r.id`,
    valores
  );
  return resultado.rows;
}

export async function buscarPorId(db, id, { travar = false } = {}) {
  const resultado = await db.query(
    `SELECT ${COLUNAS}
       FROM reservas r
       JOIN clientes c ON c.id = r.cliente_id
      WHERE r.id = $1
      ${travar ? 'FOR UPDATE OF r' : ''}`,
    [id]
  );
  return resultado.rows[0] || null;
}

/**
 * Serializa operações concorrentes sobre o MESMO data/horário.
 * O lock é liberado automaticamente no COMMIT/ROLLBACK da transação.
 */
export async function travarHorario(db, data, horario) {
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`reserva:${data}|${horario}`]);
}

/** Soma as pessoas das reservas que bloqueiam capacidade (pendente/confirmada). */
export async function somarOcupacao(db, data, horario, { ignorarId = null } = {}) {
  const resultado = await db.query(
    `SELECT COALESCE(SUM(quantidade_pessoas), 0)::int AS total
       FROM reservas
      WHERE data_reserva = $1::date
        AND horario = $2::time
        AND status IN ('pendente', 'confirmada')
        AND ($3::int IS NULL OR id <> $3::int)`,
    [data, horario, ignorarId]
  );
  return resultado.rows[0].total;
}

export async function buscarClientePorEmail(db, email) {
  const resultado = await db.query(
    'SELECT id FROM clientes WHERE LOWER(email) = LOWER($1) ORDER BY id LIMIT 1',
    [email]
  );
  return resultado.rows[0] || null;
}

export async function buscarClientePorTelefone(db, digitos) {
  const resultado = await db.query(
    `SELECT id FROM clientes
      WHERE regexp_replace(COALESCE(telefone, ''), '\\D', '', 'g') = $1
      ORDER BY id LIMIT 1`,
    [digitos]
  );
  return resultado.rows[0] || null;
}

export async function inserirCliente(db, { nome, telefone, email }) {
  const resultado = await db.query(
    'INSERT INTO clientes (nome, telefone, email) VALUES ($1, $2, $3) RETURNING id',
    [nome, telefone || null, email || null]
  );
  return resultado.rows[0];
}

export async function atualizarCliente(db, id, { nome, telefone, email }) {
  await db.query(
    `UPDATE clientes
        SET nome = $1,
            telefone = COALESCE($2, telefone),
            email = COALESCE($3, email)
      WHERE id = $4`,
    [nome, telefone || null, email || null, id]
  );
}

export async function inserirReserva(db, d) {
  const resultado = await db.query(
    `INSERT INTO reservas (cliente_id, data_reserva, horario, quantidade_pessoas, observacoes)
     VALUES ($1, $2::date, $3::time, $4, $5)
     RETURNING id`,
    [d.cliente_id, d.data_reserva, d.horario, d.quantidade_pessoas, d.observacoes || null]
  );
  return resultado.rows[0];
}

export async function atualizarReserva(db, id, d) {
  await db.query(
    `UPDATE reservas
        SET cliente_id = $1,
            data_reserva = $2::date,
            horario = $3::time,
            quantidade_pessoas = $4,
            observacoes = $5,
            atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $6`,
    [d.cliente_id, d.data_reserva, d.horario, d.quantidade_pessoas, d.observacoes || null, id]
  );
}

export async function atualizarStatus(db, id, status) {
  await db.query(
    'UPDATE reservas SET status = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2',
    [status, id]
  );
}
