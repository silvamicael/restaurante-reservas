import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import reservasRoutes from './routes/reservas.routes.js';
import * as service from './services/reservas.service.js';
import { configuracao } from './controllers/reservas.controller.js';
import { errorHandler, rotaNaoEncontrada } from './middlewares/errorHandler.js';
import { asyncHandler } from './utils/asyncHandler.js';

const app = express();

app.use(
  cors({
    // Permite apenas o(s) frontend(s) configurados (e ferramentas sem Origin, como Insomnia/curl).
    origin: (origem, callback) => callback(null, !origem || config.clientOrigins.includes(origem))
  })
);
app.use(express.json({ limit: '100kb' }));

app.get(
  '/api/health',
  asyncHandler(async (req, res) => {
    res.json({ status: 'ok', banco: await service.verificarBanco() });
  })
);
app.get('/api/config', configuracao);
app.use('/api/reservas', reservasRoutes);

app.use(rotaNaoEncontrada);
app.use(errorHandler);

export default app;
