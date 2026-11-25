# Documentação da API

Base URL local: `http://localhost:3001/api` — todas as respostas são JSON.

Formato de erro padrão:

```json
{ "erro": "Mensagem legível." }
```

Erros de validação incluem os campos:

```json
{
  "erro": "Dados inválidos.",
  "detalhes": [{ "campo": "quantidade_pessoas", "mensagem": "A quantidade de pessoas deve ser pelo menos 1." }]
}
```

| Código | Quando |
|---|---|
| 200 | Sucesso (consulta, edição, mudança de status, cancelamento) |
| 201 | Reserva criada |
| 400 | Dados inválidos (campos, data passada, fora do horário, ID ou filtro inválido, JSON malformado) |
| 404 | Reserva ou rota não encontrada |
| 409 | Conflito: sem capacidade no horário, transição de status inválida, reserva não editável |
| 500 | Erro inesperado (sem detalhes internos) |

## Objeto reserva

```json
{
  "id": 7,
  "cliente_id": 3,
  "nome": "João Martins",
  "telefone": "(48) 99944-5566",
  "email": "joao@example.com",
  "data_reserva": "2027-01-15",
  "horario": "19:30:00",
  "quantidade_pessoas": 4,
  "status": "pendente",
  "observacoes": "Preferência por área externa",
  "criado_em": "2026-11-25T22:10:00.000Z",
  "atualizado_em": "2026-11-25T22:10:00.000Z"
}
```

Status possíveis: `pendente`, `confirmada`, `cancelada`, `concluida`.

---

## GET /api/health
Verifica se a API e o banco estão ativos.
**200** → `{ "status": "ok", "banco": "ok" }` (`"banco": "indisponivel"` se não conectar).

## GET /api/config
Devolve as regras do restaurante usadas pelo frontend.
**200** → `{ "maxPessoasPorReserva": 12, "maxPessoasPorHorario": 30, "horarioAbertura": "11:00", "horarioUltimaReserva": "22:00", "intervaloMinutos": 30, "fusoHorario": "America/Sao_Paulo", "horarios": ["11:00", "11:30", "..."] }`

## GET /api/reservas
Lista as reservas ordenadas por data e horário.

Parâmetros de query (todos opcionais, combináveis):

| Parâmetro | Descrição |
|---|---|
| `data` | `AAAA-MM-DD` — somente reservas dessa data |
| `nome` | trecho do nome do cliente (sem diferenciar maiúsculas/minúsculas) |
| `status` | `pendente`, `confirmada`, `cancelada` ou `concluida` |

Exemplo: `GET /api/reservas?nome=mari&data=2026-12-01&status=confirmada`
**200** → array de reservas (vazio `[]` se nada corresponder). **400** → data ou status inválidos.

## GET /api/reservas/:id
**200** → objeto reserva. **400** → ID inválido. **404** → não encontrada.

## POST /api/reservas
Cria uma reserva (sempre com status `pendente`).

Corpo:

```json
{
  "nome": "João Martins",
  "telefone": "(48) 99944-5566",
  "email": "joao@example.com",
  "data_reserva": "2027-01-15",
  "horario": "19:30",
  "quantidade_pessoas": 4,
  "observacoes": "Preferência por área externa"
}
```

`telefone` e `email` são opcionais individualmente, mas **pelo menos um** é obrigatório. `observacoes` é opcional.

- **201** → objeto reserva criada.
- **400** → dados inválidos / data-hora no passado / horário fora do funcionamento.
- **409** → `{ "erro": "Não há capacidade disponível nesse horário." }` (ou "restam N lugar(es)").

## PUT /api/reservas/:id
Atualiza os dados de uma reserva **pendente ou confirmada**. Corpo igual ao do POST (todos os campos).
Se data, horário ou quantidade mudarem, as validações e a disponibilidade são refeitas.

- **200** → reserva atualizada.
- **400** → dados inválidos. **404** → não encontrada.
- **409** → reserva cancelada/concluída (não editável) ou sem capacidade.

## PATCH /api/reservas/:id/status
Corpo: `{ "status": "confirmada" }`

Transições permitidas: `pendente → confirmada | cancelada`; `confirmada → concluida | cancelada`; `cancelada → pendente` (reativação); `concluida` é final. Pedir o mesmo status atual devolve a reserva sem alterações.

- **200** → reserva atualizada. **400** → status inválido. **404** → não encontrada.
- **409** → transição não permitida, reativação sem capacidade ou com data/hora já passada.

## DELETE /api/reservas/:id
Cancela a reserva (soft delete: status `cancelada`, o registro permanece). Libera a capacidade do horário.

- **200** → reserva cancelada. **404** → não encontrada. **409** → reserva concluída não pode ser cancelada.

---

## Exemplos com curl

```bash
curl http://localhost:3001/api/health

curl -X POST http://localhost:3001/api/reservas -H "Content-Type: application/json" \
  -d '{"nome":"João Martins","email":"joao@example.com","data_reserva":"2027-01-15","horario":"19:30","quantidade_pessoas":4}'

curl "http://localhost:3001/api/reservas?nome=joao"

curl -X PATCH http://localhost:3001/api/reservas/1/status -H "Content-Type: application/json" -d '{"status":"confirmada"}'

curl -X DELETE http://localhost:3001/api/reservas/1
```

> Use sempre uma data **futura** nos testes. No Windows (cmd), troque as aspas simples do `-d` por aspas duplas escapadas, ou use o Insomnia/Postman.
