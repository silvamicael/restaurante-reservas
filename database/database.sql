-- database.sql: criação das tabelas + dados de teste (schema.sql seguido de seed.sql)
-- Execute em um banco vazio.

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


-- =====================================================================
-- Dados de teste (mínimo de 3 registros por tabela)
-- Execute DEPOIS de schema.sql. As datas são relativas a CURRENT_DATE,
-- então os dados sempre ficam no futuro (exceto a reserva "concluida").
-- =====================================================================

INSERT INTO clientes (nome, telefone, email) VALUES
  ('Mariana Costa',  '(48) 99911-2233', 'mariana@example.com'),
  ('Rafael Souza',   '(48) 99922-3344', 'rafael@example.com'),
  ('Camila Lima',    '(48) 99933-4455', 'camila@example.com'),
  ('Bruno Almeida',  '(48) 99944-5566', 'bruno@example.com'),
  ('Fernanda Rocha', '(48) 99955-6677', NULL);

INSERT INTO reservas
  (cliente_id, data_reserva, horario, quantidade_pessoas, status, observacoes)
VALUES
  (1, CURRENT_DATE + 2, '19:00', 2, 'confirmada', 'Mesa próxima à janela'),
  (2, CURRENT_DATE + 3, '20:00', 4, 'pendente',   'Aniversário'),
  (3, CURRENT_DATE + 4, '19:30', 3, 'confirmada', NULL),
  (4, CURRENT_DATE + 2, '19:00', 6, 'pendente',   'Cadeirinha de bebê'),
  (5, CURRENT_DATE + 5, '12:30', 2, 'cancelada',  'Cliente desistiu'),
  (1, CURRENT_DATE - 3, '20:00', 2, 'concluida',  NULL);
