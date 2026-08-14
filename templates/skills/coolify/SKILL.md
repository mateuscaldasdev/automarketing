---
name: coolify
description: Squad de Infra Coolify da Automarketing. Use quando o usuário quiser publicar, hospedar ou fazer deploy de uma aplicação self-hosted — subir stack (n8n, Evolution API, Supabase, CRM), criar banco, definir variáveis de ambiente, configurar domínio e SSL, ou diagnosticar deploy que falhou. Também nos pedidos indiretos ("sobe isso no meu servidor", "cria o n8n do cliente", "o deploy caiu").
---

# Squad: Infra na Coolify

> **Antes de perguntar qualquer coisa, leia `.automarketing/cliente.md`** — o onboarding
> do `npx automarketing` já registrou cliente, tipo de negócio, objetivo e público.
> Só pergunte o que faltar lá, e grave a resposta nova no arquivo.

Você **executa pela API** da Coolify. Só mande o dev abrir o painel quando a API
realmente não cobrir (criar token, ver log em tempo real).

---

## Configuração

```bash
export COOLIFY_URL="https://coolify.seudominio.com.br"
export COOLIFY_TOKEN="..."     # Coolify → Keys & Tokens → Create token
```

O token é **por time** e tem permissões granulares: marque **read + write + deploy**.
Sem `deploy`, a criação funciona e o deploy volta `403` com a permissão que falta.

Guarde no `.env` do projeto. Nunca no repositório.

O script fica em `.claude/skills/coolify/scripts/coolify.mjs` — zero dependências.

---

## Ordem correta de um cliente novo

Sempre nesta ordem. Pular o passo 1 é a origem da maioria dos problemas de SSL:

```bash
# 1. DNS primeiro (skill cloudflare) — proxy DESLIGADO
node .claude/skills/cloudflare/scripts/cloudflare.mjs vps cliente.com.br 89.167.14.39
node .claude/skills/cloudflare/scripts/cloudflare.mjs sub cliente.com.br n8n crm evolution

# 2. Descubra o contexto (uuid do servidor e do projeto)
node .claude/skills/coolify/scripts/coolify.mjs servidores
node .claude/skills/coolify/scripts/coolify.mjs criar-projeto cliente-x

# 3. Suba a stack
node .claude/skills/coolify/scripts/coolify.mjs stack \
  .claude/skills/coolify/stacks/n8n.yml n8n-cliente-x \
  --projeto <uuid> --servidor <uuid> --dominio https://n8n.cliente.com.br

# 4. Variáveis (só valem no próximo deploy)
node .claude/skills/coolify/scripts/coolify.mjs env <uuid-da-stack> \
  N8N_ENCRYPTION_KEY=$(openssl rand -hex 24) \
  N8N_USER=admin N8N_PASSWORD='...' POSTGRES_PASSWORD='...'

# 5. Deploy e acompanhamento
node .claude/skills/coolify/scripts/coolify.mjs deploy <uuid-da-stack>
node .claude/skills/coolify/scripts/coolify.mjs status <uuid-do-deployment>
```

Para não repetir `--projeto`/`--servidor` a cada comando, fixe `COOLIFY_PROJECT_UUID` e
`COOLIFY_SERVER_UUID` no `.env`.

---

## Stacks prontas

Em `.claude/skills/coolify/stacks/`:

| Arquivo | O que sobe | Variáveis obrigatórias |
|---|---|---|
| `n8n.yml` | n8n + Postgres | `N8N_ENCRYPTION_KEY`, `N8N_USER`, `N8N_PASSWORD`, `POSTGRES_PASSWORD` |
| `evolution-api.yml` | Evolution API + Postgres + Redis | `AUTHENTICATION_API_KEY`, `POSTGRES_PASSWORD` |

⚠️ **`N8N_ENCRYPTION_KEY` perdida = todas as credenciais salvas no n8n viram lixo.**
Gere uma vez, guarde no gerenciador de senhas do cliente.

`${SERVICE_FQDN_N8N}` e `${SERVICE_FQDN_EVOLUTION}` são **variáveis mágicas da Coolify**:
ela substitui pelo domínio que você definiu em `--dominio`. Não troque por URL fixa.

---

## Supabase self-hosted

O Supabase tem uma stack grande (Kong, GoTrue, PostgREST, Realtime, Storage, Studio,
Postgres). Dois caminhos, nesta ordem de preferência:

1. **One-click da Coolify.** Em Resources → New → Service, procure "supabase". Se existir
   na versão instalada, é o caminho — a Coolify cuida das variáveis e do roteamento.
   Pela API é `POST /api/v1/services` com `type: "supabase"`; o campo `type` aceita o
   nome do template e **varia por versão da Coolify**, então confirme na interface antes.
2. **Compose oficial.** Baixe o `docker-compose.yml` do repositório `supabase/docker` e
   suba com `stack <arquivo> <nome>`. Gere `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`
   e `SERVICE_ROLE_KEY` (as duas últimas são JWTs assinados com o `JWT_SECRET` — use o
   gerador do próprio Supabase).

Nos dois casos: **exponha só o Studio e a API (Kong) em domínio**, mantenha o Postgres
sem porta pública, e ative backup.

Se o cliente preferir o Supabase na nuvem (supabase.com), nada disso é necessário —
o CRM aceita os dois, mudando só as variáveis `SUPABASE_URL` e as chaves.

---

## Aplicação a partir de repositório

Para o CRM ou um site em Next.js:

```
POST /api/v1/applications/public          repositório público
POST /api/v1/applications/private-github-app   repositório privado
POST /api/v1/applications/dockerfile      Dockerfile na raiz
POST /api/v1/applications/dockerimage     imagem pronta
```

Campos obrigatórios em todos: `project_uuid`, `server_uuid`, `environment_name`,
e `ports_exposes` (a porta que o container escuta).

Toda app precisa de:

- Porta por variável (`PORT`), nunca fixa em código
- `.env.example` com todas as variáveis, sem valores reais
- Healthcheck em `/health` devolvendo `200`
- `Dockerfile` **ou** compose na raiz

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:$PORT/health || exit 1
CMD ["npm", "start"]
```

---

## Banco de dados

```bash
node coolify.mjs postgres crm-db --projeto <uuid> --servidor <uuid> --deploy
```

A senha aparece **uma vez** na saída do comando. Guarde na hora.

Conecte a aplicação pela **string interna** (`postgres://user:senha@nome-do-servico:5432/db`).
Nunca exponha a porta pública. Ative backup em Backups.

---

## Detalhes da API que a documentação de terceiros erra

Conferidos contra o `openapi.json` oficial do repositório da Coolify:

| Certo | Errado (aparece por aí) |
|---|---|
| `/api/v1/applications/{uuid}/envs` | `/environment-variables` |
| `/api/v1/services` com `docker_compose_raw` | `/applications/dockercompose` (não existe) |
| `POST /api/v1/deploy?uuid=...` (query) | uuid no corpo |
| `/api/v1/databases/postgresql` | `/databases` com `type` |

Base: `/api/v1`. Autenticação: `Authorization: Bearer <token>`.
Exceções fora do `/v1`: `/api/health` e `/api/feedback`.

---

## Diagnóstico

Antes de investigar qualquer coisa na Coolify, **confirme o DNS**:

```bash
node .claude/skills/cloudflare/scripts/cloudflare.mjs checar cliente.com.br n8n
```

| Sintoma | Causa quase sempre | Correção |
|---|---|---|
| SSL não emite | Proxy do Cloudflare ligado | Deixe "somente DNS" |
| Build falha | Dependência faltando no `package.json` | Veja o log com `status <uuid>` |
| Sobe e cai | Variável de ambiente ausente | `env` + novo deploy |
| 502 no domínio | Porta do container ≠ `ports_exposes` | Ajuste a porta |
| App não fala com o banco | Host público em vez do nome interno | Use o nome do serviço |
| `403` na API | Token sem a permissão `deploy` | Recrie o token com as três |
| Variável não aplicou | Env só vale no próximo deploy | Rode `deploy` de novo |

---

## Checklist de entrega

- [ ] DNS conferido (`checar`) antes do deploy
- [ ] Deploy verde e `/health` respondendo pelo domínio
- [ ] HTTPS válido, HTTP redirecionando
- [ ] Nenhuma variável no repositório
- [ ] Backup do banco ativo
- [ ] Segredos gerados (`N8N_ENCRYPTION_KEY`, senhas) entregues por canal seguro
