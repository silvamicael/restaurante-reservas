# Sistema de Reservas para Restaurante (PERN)

Aplicação web para clientes solicitarem reservas e para a equipe do restaurante consultar e gerenciar essas reservas.

- **PostgreSQL** – persistência (clientes e reservas)
- **Express / Node.js** – API REST com validação e regras de negócio
- **React + Vite** – interface (formulário, listagem, pesquisa, edição e mudança de status)

## Pré-requisitos

- Node.js **18 ou superior** (`node -v`)
- PostgreSQL instalado e **em execução** (porta padrão 5432)

## Como executar (passo a passo)

### 1. Configurar a conexão com o banco

Abra `server/.env` e ajuste a linha `DATABASE_URL` com **o seu usuário e senha** do PostgreSQL:

```
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/restaurante_reservas
```

> O arquivo vem com a senha `postgres` como exemplo (e `DB_SSL=false`). Se a sua for diferente, troque. O arquivo `.env.example` mostra todas as variáveis.

### 2. Instalar as dependências

Na pasta raiz do projeto:

```bash
npm run setup
```

(equivale a `npm install` na raiz, em `server/` e em `client/`)

### 3. Criar o banco, as tabelas e os dados de teste

```bash
npm run db:setup
```

O script cria o banco `restaurante_reservas` (se não existir), executa `database/schema.sql` e `database/seed.sql` e mostra a contagem de registros. Para apagar tudo e recriar do zero: `npm run db:reset`.

> Alternativa manual (psql/pgAdmin): crie o banco `restaurante_reservas` e execute `database/schema.sql` e depois `database/seed.sql`.

### 4. Iniciar a aplicação

```bash
npm run dev
```

Isso inicia a API em **http://localhost:3001** e o frontend em **http://localhost:5173**. Abra o frontend no navegador.

Para iniciar separadamente (dois terminais): `npm run dev:server` e `npm run dev:client`.

Teste rápido da API: abra http://localhost:3001/api/health — deve responder `{"status":"ok","banco":"ok"}`.

### 5. Executar os testes automatizados

```bash
cd server
npm run test:unit   # regras de negócio e validação (não precisa de banco)
npm run test:api    # integração com a API real + PostgreSQL (precisa do db:setup feito)
npm test            # os dois
```

O teste de integração cria reservas numa data distante (hoje + 700 dias) e remove tudo ao final; os dados do seed não são alterados.

## Usando Supabase em vez de PostgreSQL local (opcional)

O Supabase é PostgreSQL na nuvem; o projeto funciona com ele trocando apenas o `server/.env`:

1. No Supabase, abra **Connect** e copie a string da **Session pooler** (porta 5432). Evite a "Direct connection": ela usa IPv6 e falha em muitas redes.
2. No `server/.env`, use:
   ```
   DATABASE_URL=postgresql://postgres.SEU_PROJECT_REF:SUA_SENHA@aws-0-REGIAO.pooler.supabase.com:5432/postgres
   DB_SSL=true
   ```
   Não coloque `?sslmode=...` na URL. Se a senha tiver `@ # / :`, codifique (`@` vira `%40`) ou use uma senha só com letras e números.
3. Crie as tabelas: rode `npm run db:setup` **ou** cole `database/schema.sql` e `database/seed.sql` no *SQL Editor* do Supabase.
4. Rode `database/supabase-rls.sql` no SQL Editor para bloquear o acesso público às tabelas (a API Express continua funcionando).
5. **Nunca** envie o `.env` com a sua `DATABASE_URL` para o GitHub.

## Estrutura do projeto

```
restaurante-reservas/
├── database/
│   ├── schema.sql        # criação das tabelas e índices
│   ├── seed.sql          # dados de teste (5 clientes, 6 reservas)
│   ├── database.sql      # schema.sql + seed.sql em um único arquivo
│   ├── supabase-rls.sql  # só para Supabase: ativa o RLS nas tabelas
│   └── consultas.sql     # consultas para conferir os dados / contar registros
├── server/               # API Express
│   ├── scripts/setup-db.js
│   ├── src/
│   │   ├── app.js, server.js
│   │   ├── config/       # env.js (variáveis e regras) e database.js (pool + transação)
│   │   ├── routes/       # reservas.routes.js
│   │   ├── controllers/  # reservas.controller.js (HTTP)
│   │   ├── services/     # reservas.service.js (regras de negócio e transações)
│   │   ├── repositories/ # reservas.repository.js (SQL parametrizado)
│   │   ├── schemas/      # reserva.schema.js (validação com Zod)
│   │   ├── middlewares/  # errorHandler.js
│   │   └── utils/        # rules.js (regras puras), httpError.js, asyncHandler.js
│   └── tests/            # rules.test.js (unitários) e api.integration.test.js
├── client/               # React + Vite
│   └── src/
│       ├── pages/ReservasPage.jsx
│       ├── components/   # ReservaForm, ReservaList, ReservaFilters, StatusBadge
│       ├── services/     # api.js (Axios) e reservasService.js
│       └── utils/formatadores.js
└── docs/
    ├── DER.png / DER.mmd # diagrama entidade-relacionamento
    ├── API.md            # documentação dos endpoints
    └── TESTES.md         # roteiro e registro de testes
```

## Modelo de dados (DER)

Veja `docs/DER.png`. Duas tabelas, relação **CLIENTES 1:N RESERVAS**:

- `clientes (id PK, nome, telefone, email, criado_em)`
- `reservas (id PK, cliente_id FK, data_reserva, horario, quantidade_pessoas, status, observacoes, criado_em, atualizado_em)`

**Decisão sobre mesas:** o projeto usa o modelo **simples, sem tabela de mesas**. A capacidade é controlada por um **limite máximo de pessoas por horário**. Por isso não há tabela `mesas` e não há campos redundantes.

## Requisitos atendidos

Cadastrar, consultar, pesquisar (nome, data e status), ordenar por data/horário, editar, alterar o status (pendente → confirmada → concluída / cancelada), validar campos com mensagens claras, impedir datas passadas, impedir conflito de capacidade, e exibir estados de carregamento, sucesso, erro e lista vazia na interface.

## Regras de negócio adotadas

| Regra | Valor padrão (configurável no `.env`) |
|---|---|
| Horário de funcionamento para reservas | 11:00 às 22:00 (`HORARIO_ABERTURA`, `HORARIO_ULTIMA_RESERVA`) |
| Grade de horários | de 30 em 30 minutos (`INTERVALO_MINUTOS`) |
| Máximo de pessoas por reserva | 12 (`MAX_PESSOAS_POR_RESERVA`) |
| **Capacidade por horário** | **30 pessoas** (`MAX_PESSOAS_POR_HORARIO`) |
| Fuso do restaurante (para "data/hora no passado") | `America/Sao_Paulo` (`FUSO_HORARIO`) |

- Nome (mín. 2 caracteres), data, horário e quantidade de pessoas são obrigatórios; é preciso informar **telefone ou e-mail**.
- Quantidade: inteiro positivo, até o máximo por reserva.
- Data/horário precisam estar no futuro e dentro do funcionamento.
- **Disponibilidade:** a soma de pessoas das reservas **pendentes e confirmadas** do mesmo data/horário, mais a nova reserva, não pode passar do limite do horário. Reservas **canceladas** e **concluídas** não bloqueiam capacidade. Se não couber, a API responde **409**.
- **Concorrência:** a criação/edição/reativação roda dentro de uma **transação** com `pg_advisory_xact_lock` por data+horário. Requisições simultâneas para o mesmo horário são processadas uma de cada vez, então o limite nunca é ultrapassado (há um teste de integração para isso).
- **Edição:** só reservas pendentes/confirmadas podem ser editadas. Se data, horário ou quantidade mudarem, tudo é revalidado (funcionamento, futuro, capacidade — ignorando a própria reserva).
- **Transições de status permitidas:** `pendente → confirmada | cancelada`, `confirmada → concluida | cancelada`, `cancelada → pendente` (reativação, revalida capacidade e data), `concluida` é final. Outras transições retornam 409.
- **Cancelar = soft delete:** `DELETE /api/reservas/:id` muda o status para `cancelada`; o registro é mantido.
- **Cliente:** se o e-mail já existe (sem diferenciar maiúsculas), o cliente é reaproveitado (nome atualizado); sem e-mail, reaproveita pelo telefone (comparando só dígitos); senão cria um novo.
- **Segurança:** SQL sempre parametrizado; validação no backend (e também no React); erros internos nunca expõem detalhes do banco; CORS restrito ao frontend; `.env` fora do repositório.

## Documentação e testes

- Endpoints: [`docs/API.md`](docs/API.md)
- Roteiro e registro de testes: [`docs/TESTES.md`](docs/TESTES.md)

## Problemas comuns

| Sintoma | Causa provável / solução |
|---|---|
| `password authentication failed` / código 28P01 | Senha errada em `DATABASE_URL` (`server/.env`). |
| `ENOTFOUND` / host não encontrado (Supabase) | Use a string da *Session pooler*, não a Direct connection. |
| Erro de SSL/certificado (Supabase) | Confira `DB_SSL=true` e remova `?sslmode=` da URL. |
| `ECONNREFUSED` | PostgreSQL não está rodando na porta 5432. |
| Frontend mostra "Não foi possível conectar à API" | API não está rodando (`npm run dev:server`) ou a porta/URL em `client/.env` (`VITE_API_URL`) está diferente. Reinicie o Vite após mudar o `.env`. |
| Erro de CORS no navegador | Acesse o frontend por `http://localhost:5173` ou ajuste `CLIENT_ORIGIN` em `server/.env`. |
| `A porta 3001 já está em uso` | Mude `PORT` em `server/.env` (e `VITE_API_URL` em `client/.env`). |

## Limitações conhecidas

- Não há autenticação: qualquer pessoa que acessar o frontend pode gerenciar reservas. Em um cenário real, as rotas de gestão precisam de login e autorização no backend.
- Não há controle de mesas individuais (decisão de escopo descrita acima).
- A capacidade é calculada por horário exato (não por janelas de ocupação que se sobrepõem).
