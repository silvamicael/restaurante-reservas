-- =====================================================================
-- Sistema de Reservas para Restaurante - Estrutura do banco (PostgreSQL)
-- Abordagem de capacidade: limite máximo de pessoas por horário
-- (sem controle individual de mesas). Veja o README.
-- =====================================================================

CREATE TABLE IF NOT EXISTS clientes (
  id         SERIAL PRIMARY KEY,
  nome       VARCHAR(120) NOT NULL,
  telefone   VARCHAR(30),
  email      VARCHAR(160),
  criado_em  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservas (
  id                  SERIAL PRIMARY KEY,
  cliente_id          INTEGER NOT NULL REFERENCES clientes(id),
  data_reserva        DATE NOT NULL,
  horario             TIME NOT NULL,
  quantidade_pessoas  INTEGER NOT NULL CHECK (quantidade_pessoas > 0),
  status              VARCHAR(20) NOT NULL DEFAULT 'pendente'
                      CHECK (status IN ('pendente', 'confirmada', 'cancelada', 'concluida')),
  observacoes         TEXT,
  criado_em           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para as consultas mais frequentes (listagem/ordenação e soma de ocupação)
CREATE INDEX IF NOT EXISTS idx_reservas_data_horario ON reservas (data_reserva, horario);
CREATE INDEX IF NOT EXISTS idx_reservas_cliente      ON reservas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_email_lower  ON clientes (LOWER(email));
