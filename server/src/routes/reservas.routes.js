import { Router } from 'express';
import * as controller from '../controllers/reservas.controller.js';

const router = Router();

router.get('/', controller.listar);
router.get('/:id', controller.buscar);
router.post('/', controller.criar);
router.put('/:id', controller.atualizar);
router.patch('/:id/status', controller.alterarStatus);
router.delete('/:id', controller.cancelar); // cancela (soft delete), não apaga o registro

export default router;
