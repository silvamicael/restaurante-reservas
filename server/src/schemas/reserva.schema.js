import { z } from 'zod';
import { dataEhValida } from '../utils/rules.js';

const texto = (v) => (typeof v === 'string' ? v.trim() : undefined);
const opcional = (v) => {
  const t = texto(v);
  return t === undefined || t === '' ? undefined : t;
};

/**
 * Normaliza o corpo recebido antes de validar: remove espaços, transforma
 * texto vazio em "ausente" nos campos opcionais e converte a quantidade em número.
 * Campos desconhecidos (ex.: "status") são descartados.
 */
export function normalizarCorpo(corpo) {
  const b = corpo && typeof corpo === 'object' && !Array.isArray(corpo) ? corpo : {};
  let qtd = b.quantidade_pessoas;
  if (typeof qtd === 'string') qtd = qtd.trim() === '' ? 0 : Number(qtd);
  if (typeof qtd !== 'number' || !Number.isFinite(qtd)) qtd = 0;

  return {
    nome: texto(b.nome) ?? '',
    telefone: opcional(b.telefone),
    email: opcional(b.email),
    data_reserva: texto(b.data_reserva) ?? '',
    horario: texto(b.horario) ?? '',
    quantidade_pessoas: qtd,
    observacoes: opcional(b.observacoes)
  };
}

export function criarReservaSchema(cfg) {
  return z
    .object({
      nome: z
        .string()
        .min(2, 'Informe o nome do cliente (mínimo de 2 caracteres).')
        .max(120, 'O nome deve ter no máximo 120 caracteres.'),
      telefone: z
        .string()
        .regex(/^[\d\s()+\-.]{8,30}$/, 'Telefone inválido. Use apenas números, espaços, parênteses, + e -.')
        .optional(),
      email: z
        .string()
        .max(160, 'O e-mail deve ter no máximo 160 caracteres.')
        .email('E-mail inválido.')
        .optional(),
      data_reserva: z
        .string()
        .refine(dataEhValida, 'Informe uma data válida no formato AAAA-MM-DD.'),
      horario: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido no formato HH:MM.'),
      quantidade_pessoas: z
        .number()
        .int('A quantidade de pessoas deve ser um número inteiro.')
        .min(1, 'A quantidade de pessoas deve ser pelo menos 1.')
        .max(
          cfg.maxPessoasPorReserva,
          `Cada reserva aceita no máximo ${cfg.maxPessoasPorReserva} pessoas.`
        ),
      observacoes: z.string().max(500, 'As observações devem ter no máximo 500 caracteres.').optional()
    })
    .superRefine((dados, ctx) => {
      if (!dados.telefone && !dados.email) {
        ctx.addIssue({
          code: 'custom',
          path: ['telefone'],
          message: 'Informe telefone ou e-mail para contato.'
        });
      }
    });
}
