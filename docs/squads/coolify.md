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

| Arquivo | Sobe | Variáveis obrigatórias |
|---|---|---|
| `stacks/n8n.yml` | n8n + Postgres | `N8N_ENCRYPTION_KEY`, `N8N_USER`, `N8N_PASSWORD`, `POSTGRES_PASSWORD` |
| `stacks/evolution-api.yml` | Evolution API + Postgres + Redis | `AUTHENTICATION_API_KEY`, `POSTGRES_PASSWORD` |

⚠️ **`N8N_ENCRYPTION_KEY` perdida inutiliza todas as credenciais salvas no n8n.** Gere
uma vez e guarde no gerenciador de senhas do cliente.

As stacks usam `${SERVICE_FQDN_N8N}` — variável mágica da Coolify que vira o domínio
que você passou em `--dominio`. Não substitua por URL fixa.

**Supabase self-hosted:** a skill documenta os dois caminhos (one-click da Coolify e
compose oficial do `supabase/docker`), com a ressalva de que o nome do template
one-click muda por versão — confirme na interface antes de automatizar.

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
