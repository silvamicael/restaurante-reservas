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
