# Roteiro e registro de testes

## Testes automatizados

| Comando (dentro de `server/`) | O que cobre | Precisa de banco? |
|---|---|---|
| `npm run test:unit` | Regras puras (data válida, horário, passado, capacidade, transições) e validação Zod | Não |
| `npm run test:api` | Todos os cenários abaixo, via HTTP na API real, incluindo concorrência | Sim (`npm run db:setup`) |

Cole aqui a saída dos comandos na sua máquina como evidência:

```
(saída de npm run test:unit)

(saída de npm run test:api)
```

## Cenários (API — Insomnia/Postman e navegador)

Use uma data futura. Preencha as duas últimas colunas ao executar.

| # | Cenário | Requisição | Esperado | Obtido | OK? |
|---|---|---|---|---|---|
| 1 | API ativa | `GET /api/health` | 200 `{status:"ok", banco:"ok"}` | | |
| 2 | Criar reserva válida | `POST /api/reservas` com corpo válido | 201 e aparece na listagem | | |
| 3 | Nome vazio | `POST` com `"nome": ""` | 400 com mensagem sobre o nome | | |
| 4 | Data vazia | `POST` com `"data_reserva": ""` | 400 | | |
| 5 | Quantidade 0 / negativa | `POST` com `0` e `-2` | 400 | | |
| 6 | Quantidade acima do máximo | `POST` com `13` | 400 | | |
| 7 | Data no passado | `POST` com `2020-01-01` | 400 "data e horário futuros" | | |
| 8 | Horário fora do funcionamento | `POST` com `03:00` e `19:10` | 400 | | |
| 9 | Sem telefone e sem e-mail | `POST` sem contato | 400 | | |
| 10 | Horário indisponível | Criar 3 reservas de 12 pessoas no mesmo data/horário | 3ª retorna 409 e não é gravada | | |
| 11 | Cancelar libera vaga | `DELETE /api/reservas/:id` e repetir a 3ª | status `cancelada`; nova reserva passa a ser aceita | | |
| 12 | Pesquisar por nome | `GET /api/reservas?nome=mari` | só reservas de clientes com "mari" | | |
| 13 | Pesquisar por data | `GET /api/reservas?data=AAAA-MM-DD` | só reservas da data | | |
| 14 | Ordenação | `GET /api/reservas` | ordenado por data e horário | | |
| 15 | Editar reserva | `PUT /api/reservas/:id` | 200 com dados novos | | |
| 16 | Editar inexistente | `PUT /api/reservas/99999` | 404 | | |
| 17 | Confirmar / concluir | `PATCH .../status` | 200 e status atualizado | | |
| 18 | Transição inválida | concluída → confirmada | 409 | | |
| 19 | Status inválido | `{ "status": "xpto" }` | 400 | | |
| 20 | Requisições simultâneas | 5 `POST` ao mesmo tempo no mesmo horário | no máximo 2 aceitas (12+12 ≤ 30); demais 409 | | |

## Cenários (interface React)

| # | Cenário | Esperado | OK? |
|---|---|---|---|
| 21 | Abrir a página | Lista carrega ("Carregando reservas..." e depois a tabela) | |
| 22 | Criar reserva pelo formulário | Mensagem verde de sucesso e a reserva aparece na lista | |
| 23 | Enviar formulário com campos vazios | Mensagens de erro nos campos, sem chamar a API | |
| 24 | Reservar horário lotado | Mensagem vermelha de erro (capacidade) no formulário | |
| 25 | Pesquisar por nome / data / status e "Limpar filtros" | Lista filtra e volta ao normal | |
| 26 | Pesquisa sem resultados | "Nenhuma reserva encontrada." | |
| 27 | Editar uma reserva (botão Editar) | Modal preenchido; ao salvar, lista atualizada | |
| 28 | Confirmar, concluir, cancelar e reativar | Status e botões mudam conforme as regras | |
| 29 | Parar a API e recarregar | Mensagem "Não foi possível conectar à API..." com botão "Tentar novamente"; página não trava | |
| 30 | Recarregar a página | Os dados continuam (vêm do banco) | |

## Evidência do requisito de dados (3 registros por tabela)

Execute `database/consultas.sql` (primeira consulta) no psql/pgAdmin e anexe o resultado:

```
 tabela   | total
----------+-------
 clientes |     5
 reservas |     6
```
