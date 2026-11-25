-- Consultas para conferir os dados e comprovar o requisito acadêmico
-- (pelo menos 3 registros por tabela)

-- Contagem de registros por tabela
SELECT 'clientes' AS tabela, COUNT(*) AS total FROM clientes
UNION ALL
SELECT 'reservas', COUNT(*) FROM reservas;

-- Listar reservas com os dados do cliente, ordenadas por data e horário
SELECT r.id, c.nome, c.telefone, r.data_reserva, r.horario,
       r.quantidade_pessoas, r.status
FROM reservas r
JOIN clientes c ON c.id = r.cliente_id
ORDER BY r.data_reserva, r.horario;

-- Filtrar por data
SELECT r.*, c.nome
FROM reservas r
JOIN clientes c ON c.id = r.cliente_id
WHERE r.data_reserva = CURRENT_DATE + 2
ORDER BY r.horario;

-- Filtrar por nome (parcial, sem diferenciar maiúsculas/minúsculas)
SELECT r.id, c.nome, r.data_reserva, r.horario
FROM reservas r
JOIN clientes c ON c.id = r.cliente_id
WHERE c.nome ILIKE '%mari%';

-- Ocupação por data/horário (apenas reservas que bloqueiam capacidade)
SELECT data_reserva, horario, SUM(quantidade_pessoas) AS pessoas
FROM reservas
WHERE status IN ('pendente', 'confirmada')
GROUP BY data_reserva, horario
ORDER BY data_reserva, horario;
