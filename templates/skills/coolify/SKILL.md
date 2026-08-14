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

Em `.claude/skills/coolify/stacks/`. São o **padrão da casa** — use estas, não invente
compose novo.

### `n8n.yml` — n8n em modo fila

Sobe **seis serviços**: `n8n` (editor + webhook), `n8n-worker`, `task-runners`,
`task-runner-worker`, `postgresql` e `redis`.

Por que modo fila (`EXECUTIONS_MODE=queue`): o editor não trava enquanto os workflows
executam, e dá para escalar worker sem mexer no resto. É o que aguenta cliente com volume.

Por que **dois domínios**:

```
N8N_EDITOR_URL   https://editor.cliente.com.br    ← interface, acesso restrito
N8N_WEBHOOK_URL  https://webhook.cliente.com.br/  ← público, com barra no final
N8N_HOSTNAME     editor.cliente.com.br            ← sem protocolo
```

Separar editor de webhook deixa o público batendo só no que precisa ser público.
Crie os dois no DNS antes de subir:

```bash
node .../cloudflare.mjs sub cliente.com.br editor webhook
```

Os `task-runners` externos (`n8nio/runners`) executam código de nó em processo separado —
com `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`, um workflow malicioso não lê as variáveis do host.

### `evolution-go.yml` — WhatsApp

`evolution-go` + Postgres dedicado (`max_connections=200`), com mídia no MinIO/S3.

Variáveis suas: `POSTGRES_PASSWORD`, `GLOBAL_API_KEY`, `MINIO_HOST`,
`MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`.

`extra_hosts: ${MINIO_HOST}:host-gateway` serve para quando o MinIO roda **na mesma VPS**
e o domínio público não resolve de dentro do container. S3 externo de verdade: remova a linha.

### As variáveis `SERVICE_*` são da Coolify

`$SERVICE_USER_POSTGRES`, `$SERVICE_PASSWORD_POSTGRES`, `${SERVICE_PASSWORD_ENCRYPTION}`,
`$SERVICE_PASSWORD_N8N`, `SERVICE_URL_N8N_5678` — a Coolify **gera e guarda sozinha** na
primeira subida. Não defina à mão, não troque por valor fixo.

⚠️ `SERVICE_PASSWORD_ENCRYPTION` é a `N8N_ENCRYPTION_KEY`. **Recriar a stack do zero
gera outra chave e todas as credenciais salvas no n8n viram lixo.** Em migração, ela
tem que ser a mesma dos dois lados.

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

## Migração de VPS sem perder dado

Duas situações completamente diferentes. Descubra qual é **antes** de qualquer coisa.

### Caso A — os dois servidores estão na mesma Coolify

A Coolify migra sozinha, inclusive os volumes:

```bash
node .../coolify.mjs servidores                 # pegue o uuid do servidor destino
node .../coolify.mjs migrar <uuid-da-stack> --destino <uuid-do-servidor>
node .../coolify.mjs deploy <uuid-da-stack>
```

Ela **para o recurso**, transfere os volumes, atualiza os registros e espera o redeploy.
Use `--banco` para banco e `--app` para aplicação. `--sem-volumes` só se você já tem os
dados no destino por outro caminho.

Janela de indisponibilidade: da parada até o deploy terminar.

### Caso B — Coolifys diferentes, ou VPS sem Coolify

Use `scripts/migrar-vps.sh`. Ele **nunca apaga nada na origem** — a VPS antiga continua
de pé e é o seu rollback.

```bash
./migrar-vps.sh inventario root@origem                    # o que existe e quanto pesa
./migrar-vps.sh backup     root@origem  ./backup-cliente  # dumps + volumes + variáveis
# crie as stacks no destino, com as MESMAS chaves, e deixe PARADAS
./migrar-vps.sh restaurar  root@destino ./backup-cliente
# deploy no destino, pela Coolify
./migrar-vps.sh conferir   root@destino
# só então:
node .../cloudflare.mjs vps cliente.com.br <IP-NOVO>
```

### O que quebra se você esquecer

| Item | Se não viajar igual | Onde está |
|---|---|---|
| `N8N_ENCRYPTION_KEY` | **Todas as credenciais do n8n viram lixo** — cada integração precisa ser refeita à mão | `variaveis.txt` do backup |
| Volume `evolution_instances` | **Cada número precisa ler QR de novo** — o cliente fica sem WhatsApp até alguém escanear | volume |
| Banco do n8n | Workflows, execuções e histórico somem | `pg_dumpall` |
| `GLOBAL_API_KEY` da Evolution | Todo sistema que chama a API leva 401 | `variaveis.txt` |
| Volume `n8n-data` | Configurações locais e arquivos em `/files` | volume |
| Bucket do MinIO | Mídias das conversas somem | fora do Docker — copie à parte |

### A ordem que dá rollback

1. **Backup completo e guardado fora das duas VPS.**
2. Stacks criadas no destino, com as mesmas chaves, **paradas**.
3. Restaurar volumes e bancos.
4. Deploy no destino.
5. **Conferir com a origem ainda no ar** — n8n abre uma credencial sem erro? Evolution
   lista as instâncias como `open` sem pedir QR? A contagem de registros bate?
6. **Só então virar o DNS.** Como tudo é CNAME para `vps.`, é um comando:
   `cloudflare.mjs vps cliente.com.br <IP-NOVO>`.
7. Deixe a origem ligada por alguns dias. Deu problema? Volte o IP no mesmo comando.

Nunca desligue a origem no mesmo dia. O custo de manter uma VPS por uma semana é menor
que o de descobrir na quarta-feira que faltou uma tabela.

⚠️ **Webhooks precisam de atenção extra.** Se o `WEBHOOK_URL` do n8n mudar de domínio,
todo sistema externo que aponta para lá (Evolution, gateways de pagamento, formulários)
precisa ser reapontado. Mantendo o mesmo domínio e trocando só o IP no CNAME, nada disso
é necessário — mais uma razão para o padrão de DNS da casa.

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
