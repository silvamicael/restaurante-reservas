import pg from 'pg';
import { config } from './env.js';

const { Pool, types } = pg;

// Por padrão o driver converte DATE em objeto Date (com problemas de fuso horário).
// Aqui mantemos DATE como texto 'AAAA-MM-DD'. TIME já chega como 'HH:MM:SS'.
types.setTypeParser(1082, (valor) => valor);

// DB_SSL=true é necessário em bancos na nuvem, como o Supabase. Em PostgreSQL local, deixe false.
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

export const pool = new Pool({ connectionString: config.databaseUrl, ssl });

pool.on('error', (error) => {
  console.error('Erro inesperado no pool do PostgreSQL:', error.message);
});

/**
 * Executa `callback(client)` dentro de uma transação.
 * Faz COMMIT se tudo der certo e ROLLBACK se qualquer erro for lançado.
 */
export async function comTransacao(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await callback(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Falha no ROLLBACK:', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
}
