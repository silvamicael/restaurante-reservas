// Cria o banco (se não existir), as tabelas e os dados de teste.
//   npm run db:setup   -> cria o que faltar; só insere os dados de teste se as tabelas estiverem vazias
//   npm run db:reset   -> APAGA as tabelas e recria tudo do zero
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const reset = process.argv.includes('--reset');
const usaSsl = process.env.DB_SSL === 'true'; // true em bancos na nuvem (ex.: Supabase)
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const lerSql = (arquivo) => readFile(path.join(raiz, 'database', arquivo), 'utf8');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida. Copie server/.env.example para server/.env e ajuste.');
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL);
const nomeBanco = decodeURIComponent(url.pathname.replace(/^\//, ''));
if (!/^[A-Za-z0-9_]+$/.test(nomeBanco)) {
  console.error('O nome do banco deve conter apenas letras, números e _.');
  process.exit(1);
}

async function garantirBanco() {
  const admin = new URL(process.env.DATABASE_URL);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const existe = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [nomeBanco]);
    if (!existe.rowCount) {
      await client.query(`CREATE DATABASE "${nomeBanco}"`);
      console.log(`Banco "${nomeBanco}" criado.`);
    } else {
      console.log(`Banco "${nomeBanco}" já existe.`);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  // Em bancos na nuvem (Supabase) o banco já existe e CREATE DATABASE não é permitido.
  if (!usaSsl) await garantirBanco();

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: usaSsl ? { rejectUnauthorized: false } : undefined
  });
  await client.connect();
  try {
    if (reset) {
      await client.query('DROP TABLE IF EXISTS reservas, clientes CASCADE');
      console.log('Tabelas antigas removidas.');
    }

    await client.query(await lerSql('schema.sql'));
    console.log('Tabelas criadas/verificadas (schema.sql).');

    const { rows } = await client.query('SELECT COUNT(*)::int AS total FROM clientes');
    if (rows[0].total === 0) {
      await client.query(await lerSql('seed.sql'));
      console.log('Dados de teste inseridos (seed.sql).');
    } else {
      console.log('Tabelas já possuem dados; seed.sql não foi executado (use db:reset para recriar).');
    }

    const c = await client.query('SELECT COUNT(*)::int AS total FROM clientes');
    const r = await client.query('SELECT COUNT(*)::int AS total FROM reservas');
    console.log(`Registros -> clientes: ${c.rows[0].total} | reservas: ${r.rows[0].total}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Falha ao preparar o banco:', error.message);
  if (error.code === '28P01') console.error('Usuário/senha incorretos no DATABASE_URL.');
  if (error.code === 'ECONNREFUSED') console.error('O PostgreSQL não está em execução nessa porta.');
  process.exit(1);
});
