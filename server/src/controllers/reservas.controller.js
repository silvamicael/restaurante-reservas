import * as service from '../services/reservas.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const configuracao = (req, res) => res.json(service.obterConfiguracao());

export const listar = asyncHandler(async (req, res) => {
  res.json(await service.listar(req.query));
});

export const buscar = asyncHandler(async (req, res) => {
  res.json(await service.buscar(req.params.id));
});

export const criar = asyncHandler(async (req, res) => {
  res.status(201).json(await service.criar(req.body));
});

export const atualizar = asyncHandler(async (req, res) => {
  res.json(await service.atualizar(req.params.id, req.body));
});

export const alterarStatus = asyncHandler(async (req, res) => {
  res.json(await service.alterarStatus(req.params.id, req.body?.status));
});

export const cancelar = asyncHandler(async (req, res) => {
  res.json(await service.cancelar(req.params.id));
});
