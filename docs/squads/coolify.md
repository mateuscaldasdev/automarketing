# Squad: Infra na Coolify

`coolify` · tipo `skill` · instala em `.claude/skills/coolify/`

Sobe stacks, aplicações e bancos **pela API da Coolify**, com deploy, variáveis de
ambiente e diagnóstico. Vem com stacks prontas de n8n e Evolution API.

---

## Quando ativa sozinho

- "sobe o n8n do cliente"
- "publica esse site"
- "cria o banco do CRM"
- "o deploy tá dando 502"

---

## Configuração

```bash
export COOLIFY_URL="https://coolify.seudominio.com.br"
export COOLIFY_TOKEN="..."     # Keys & Tokens → Create token
```

O token precisa das três permissões: **read + write + deploy**. Sem `deploy`, criar
funciona e o deploy volta `403` dizendo qual permissão falta.

---

## Comandos

```bash
node .../coolify.mjs servidores                    # pegue o uuid do servidor
node .../coolify.mjs criar-projeto cliente-x
node .../coolify.mjs recursos                      # tudo que roda, com status

node .../coolify.mjs stack stacks/n8n.yml n8n-cliente \
  --projeto <uuid> --servidor <uuid> --dominio https://n8n.cliente.com.br

node .../coolify.mjs env <uuid> N8N_USER=admin POSTGRES_PASSWORD=...
node .../coolify.mjs postgres crm-db --projeto <uuid> --servidor <uuid> --deploy
node .../coolify.mjs deploy <uuid> [--force]
node .../coolify.mjs status <uuid-do-deployment>
node .../coolify.mjs logs <uuid>
```

Fixe `COOLIFY_PROJECT_UUID` e `COOLIFY_SERVER_UUID` no `.env` para não repetir as flags.

---

## Stacks prontas

São o padrão da casa, não exemplos genéricos.

### `stacks/n8n.yml` — n8n em modo fila

Seis serviços: `n8n`, `n8n-worker`, `task-runners`, `task-runner-worker`, `postgresql`,
`redis`. Modo fila (`EXECUTIONS_MODE=queue`) para o editor não travar enquanto os
workflows executam.

**Dois domínios**, de propósito — editor restrito, webhook público:

```
N8N_EDITOR_URL   https://editor.cliente.com.br
N8N_WEBHOOK_URL  https://webhook.cliente.com.br/   ← com barra no final
N8N_HOSTNAME     editor.cliente.com.br             ← sem protocolo
```

### `stacks/evolution-go.yml` — WhatsApp

`evolution-go` + Postgres dedicado, mídia no MinIO/S3. Variáveis: `POSTGRES_PASSWORD`,
`GLOBAL_API_KEY`, `MINIO_HOST`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`.

### As variáveis `SERVICE_*`

`$SERVICE_USER_POSTGRES`, `${SERVICE_PASSWORD_ENCRYPTION}`, `$SERVICE_PASSWORD_N8N` e
companhia são **geradas pela própria Coolify** na primeira subida. Não defina à mão.

⚠️ `SERVICE_PASSWORD_ENCRYPTION` é a `N8N_ENCRYPTION_KEY`. Recriar a stack do zero gera
outra chave e **todas as credenciais salvas no n8n viram lixo**.

**Supabase self-hosted:** a skill documenta os dois caminhos (one-click da Coolify e
compose oficial do `supabase/docker`), com a ressalva de que o nome do template
one-click muda por versão — confirme na interface antes de automatizar.

---

## Migração de VPS

Dois caminhos, e o primeiro passo é descobrir qual é o seu.

**Mesma Coolify** — ela migra sozinha, com volumes:

```bash
node .../coolify.mjs migrar <uuid> --destino <uuid-do-servidor>
node .../coolify.mjs deploy <uuid>
```

**Coolifys diferentes ou VPS sem Coolify** — `scripts/migrar-vps.sh`, que **nunca apaga
nada na origem**:

```bash
./migrar-vps.sh inventario root@origem
./migrar-vps.sh backup     root@origem  ./backup-cliente
./migrar-vps.sh restaurar  root@destino ./backup-cliente
./migrar-vps.sh conferir   root@destino
node .../cloudflare.mjs vps cliente.com.br <IP-NOVO>    # só no final
```

O que quebra se você esquecer:

| Item | Consequência |
|---|---|
| `N8N_ENCRYPTION_KEY` | Todas as credenciais do n8n viram lixo |
| Volume `evolution_instances` | Cada número precisa ler QR de novo |
| Banco do n8n | Workflows e histórico somem |
| `GLOBAL_API_KEY` | Quem chama a Evolution leva 401 |
| Bucket do MinIO | Mídias das conversas somem (fica fora do Docker — copie à parte) |

A virada de DNS é **o último passo**, depois de conferir com a origem ainda no ar. E é um
comando só, porque tudo é CNAME para `vps.` — que também é o rollback.

---

## A ordem que evita 80% dos problemas

```
1. DNS (skill cloudflare, proxy off)
2. servidores / criar-projeto      → contexto
3. stack                           → cria o recurso
4. env                             → variáveis
5. deploy → status                 → sobe e acompanha
```

Variável definida depois do deploy **só vale no deploy seguinte**.

---

## Correções de documentação incorreta que circula por aí

A skill foi escrita contra o `openapi.json` oficial do repositório da Coolify, e corrige
quatro erros comuns:

| Certo | Errado |
|---|---|
| `/api/v1/applications/{uuid}/envs` | `/environment-variables` |
| `/api/v1/services` com `docker_compose_raw` | `/applications/dockercompose` (não existe) |
| `POST /api/v1/deploy?uuid=...` (query string) | uuid no corpo |
| `/api/v1/databases/postgresql` | `/databases` com campo `type` |

---

## Diagnóstico

| Sintoma | Causa quase sempre |
|---|---|
| SSL não emite | Proxy do Cloudflare ligado |
| Build falha | Dependência faltando no `package.json` |
| Sobe e cai | Variável de ambiente ausente |
| 502 no domínio | Porta do container ≠ `ports_exposes` |
| App não fala com o banco | Host público em vez do nome interno do serviço |
| `403` na API | Token sem a permissão `deploy` |

---

## Como customizar

- **Stacks novas** — jogue o `.yml` em `stacks/` e use com `stack <arquivo> <nome>`
- **Dockerfile de referência** — na skill, troque se sua stack padrão não for Node
- **Tabela de diagnóstico** — acrescente os erros que você já apanhou
