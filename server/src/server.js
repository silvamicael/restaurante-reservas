import { config } from './config/env.js';
import app from './app.js';
import { pool } from './config/database.js';

if (!config.databaseUrl) {
  console.error('DATABASE_URL não configurada. Copie server/.env.example para server/.env e ajuste.');
  process.exit(1);
}

const servidor = app.listen(config.port, async () => {
  console.log(`API disponível em http://localhost:${config.port}/api`);
  try {
    await pool.query('SELECT 1');
    console.log('Conexão com o PostgreSQL: OK');
  } catch (error) {
    console.error(`ATENÇÃO: não foi possível conectar ao PostgreSQL (${error.message}).`);
    console.error('Confira o DATABASE_URL no .env e se o banco foi criado (npm run db:setup).');
  }
});

servidor.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`A porta ${config.port} já está em uso. Altere PORT no .env ou encerre o outro processo.`);
  } else {
    console.error('Erro ao iniciar o servidor:', error.message);
  }
  process.exit(1);
});

const encerrar = async () => {
  servidor.close();
  await pool.end();
  process.exit(0);
};
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
