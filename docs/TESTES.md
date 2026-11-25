# Roteiro e registro de testes

## Testes automatizados

| Comando (dentro de `server/`) | O que cobre | Precisa de banco? | Resultado |
|---|---|---|---|
| `npm run test:unit` | Regras puras (data válida, horário, passado, capacidade, transições) e validação Zod | Não | ✅ Aprovado |
| `npm run test:api` | Todos os cenários abaixo, via HTTP na API real, incluindo concorrência | Sim (`npm run db:setup`) | ✅ Aprovado |

### Resultado da execução

- `npm run test:unit`: executado com sucesso.
- `npm run test:api`: executado com sucesso.
- Nenhuma falha identificada, conforme execução informada.

## Cenários (API — Insomnia/Postman e navegador)

| # | Cenário | Requisição | Esperado | Obtido | OK? |
|---|---|---|---|---|---|
| 1 | API ativa | `GET /api/health` | 200 `{status:"ok", banco:"ok"}` | 200 — API e banco operacionais | ✅ |
| 2 | Criar reserva válida | `POST /api/reservas` com corpo válido | 201 e aparece na listagem | 201 — Reserva criada e listada | ✅ |
| 3 | Nome vazio | `POST` com `"nome": ""` | 400 com mensagem sobre o nome | 400 — Nome inválido | ✅ |
| 4 | Data vazia | `POST` com `"data_reserva": ""` | 400 | 400 — Data inválida | ✅ |
| 5 | Quantidade 0 / negativa | `POST` com `0` e `-2` | 400 | 400 — Quantidades rejeitadas | ✅ |
| 6 | Quantidade acima do máximo | `POST` com `13` | 400 | 400 — Limite máximo respeitado | ✅ |
| 7 | Data no passado | `POST` com `2020-01-01` | 400 — Data e horário futuros | 400 — Reserva rejeitada | ✅ |
| 8 | Horário fora do funcionamento | `POST` com `03:00` e `19:10` | 400 | 400 — Horários rejeitados | ✅ |
| 9 | Sem telefone e sem e-mail | `POST` sem contato | 400 | 400 — Contato obrigatório | ✅ |
| 10 | Horário indisponível | Criar 3 reservas de 12 pessoas no mesmo horário | 3ª retorna 409 e não é gravada | Duas reservas aceitas e terceira rejeitada com 409 | ✅ |
| 11 | Cancelar libera vaga | `DELETE /api/reservas/:id` e repetir a 3ª | Status `cancelada`; nova reserva aceita | Reserva cancelada e capacidade liberada | ✅ |
| 12 | Pesquisar por nome | `GET /api/reservas?nome=mari` | Só reservas de clientes com "mari" | Filtro aplicado corretamente | ✅ |
| 13 | Pesquisar por data | `GET /api/reservas?data=AAAA-MM-DD` | Só reservas da data | Filtro aplicado corretamente | ✅ |
| 14 | Ordenação | `GET /api/reservas` | Ordenado por data e horário | Ordenação correta | ✅ |
| 15 | Editar reserva | `PUT /api/reservas/:id` | 200 com dados novos | 200 — Dados atualizados | ✅ |
| 16 | Editar inexistente | `PUT /api/reservas/99999` | 404 | 404 — Reserva não encontrada | ✅ |
| 17 | Confirmar / concluir | `PATCH .../status` | 200 e status atualizado | 200 — Status atualizado corretamente | ✅ |
| 18 | Transição inválida | Concluída → confirmada | 409 | 409 — Transição rejeitada | ✅ |
| 19 | Status inválido | `{ "status": "xpto" }` | 400 | 400 — Status rejeitado | ✅ |
| 20 | Requisições simultâneas | 5 `POST` ao mesmo tempo no mesmo horário | No máximo 2 aceitas; demais 409 | Duas reservas aceitas e três rejeitadas com 409 | ✅ |

## Cenários (interface React)

| # | Cenário | Esperado | OK? |
|---|---|---|---|
| 21 | Abrir a página | Lista carrega ("Carregando reservas..." e depois a tabela) | ✅ |
| 22 | Criar reserva pelo formulário | Mensagem verde de sucesso e a reserva aparece na lista | ✅ |
| 23 | Enviar formulário com campos vazios | Mensagens de erro nos campos, sem chamar a API | ✅ |
| 24 | Reservar horário lotado | Mensagem vermelha de erro de capacidade no formulário | ✅ |
| 25 | Pesquisar por nome / data / status e "Limpar filtros" | Lista filtra e volta ao normal | ✅ |
| 26 | Pesquisa sem resultados | "Nenhuma reserva encontrada." | ✅ |
| 27 | Editar uma reserva (botão Editar) | Modal preenchido; ao salvar, lista atualizada | ✅ |
| 28 | Confirmar, concluir, cancelar e reativar | Status e botões mudam conforme as regras | ✅ |
| 29 | Parar a API e recarregar | Mensagem de erro de conexão com botão "Tentar novamente"; página não trava | ✅ |
| 30 | Recarregar a página | Os dados continuam armazenados no banco | ✅ |

## Evidência do requisito de dados (3 registros por tabela)

Consulta de verificação disponível em `database/consultas.sql`.

| Tabela | Total de registros | Mínimo exigido | Resultado |
|---|---:|---:|---|
| clientes | 5 | 3 | ✅ Aprovado |
| reservas | 6 | 3 | ✅ Aprovado |

Ambas as tabelas atendem ao requisito mínimo de três registros.

## Resumo dos resultados

| Categoria | Cenários | Aprovados | Reprovados |
|---|---:|---:|---:|
| API / Backend | 20 | 20 | 0 |
| Interface React / Frontend | 10 | 10 | 0 |
| **Total** | **30** | **30** | **0** |

- **Taxa de aprovação:** 100%.
- **Testes automatizados:** aprovados.
- **Integração entre frontend, backend e banco de dados:** aprovada.
- **Validação das regras de negócio:** aprovada.
- **Controle de capacidade e concorrência:** aprovado.
- **Persistência dos dados:** aprovada.
- **Requisito mínimo de registros:** atendido.

## Conclusão

Todos os 30 cenários previstos no roteiro de testes foram aprovados. O sistema MesaFlow apresentou o comportamento esperado nas operações de cadastro, consulta, edição, cancelamento e gerenciamento de reservas.

As validações de dados, regras de negócio, controle de capacidade, requisições simultâneas, tratamento de erros e integração entre frontend, backend e banco de dados foram concluídas com sucesso.

**Status final: ✅ APROVADO.**