# CRM Automarketing

CRM open source, sem dependências de runtime: funil de leads em kanban, controle de
estoque, WhatsApp via Evolution API e webhooks para o n8n.

## Rodar

```bash
cp .env.example .env
npm start
# http://localhost:3333
```

Com Docker:

```bash
docker compose up -d
```

Os dados ficam em `data/db.json` (criado com registros de exemplo no primeiro start).

## API

| Método | Rota | O que faz |
|---|---|---|
| GET | `/health` | Healthcheck (usado pela Coolify) |
| GET | `/api/metricas` | Totais do funil, estoque e integrações |
| GET | `/api/leads` | Lista leads |
| POST | `/api/leads` | Cria lead → dispara `lead.criado` no n8n |
| GET/PATCH/DELETE | `/api/leads/:id` | Lê, atualiza (etapa dispara `lead.etapa_alterada`) ou remove |
| GET | `/api/produtos` | Lista produtos |
| POST | `/api/produtos` | Cria produto |
| DELETE | `/api/produtos/:id` | Remove produto |
| POST | `/api/produtos/:id/movimentar` | `{tipo:'entrada'\|'saida', quantidade, motivo}` — bloqueia saldo negativo e dispara `estoque.abaixo_do_minimo` |
| GET | `/api/movimentacoes` | Últimas 50 movimentações |
| GET | `/api/mensagens` | Últimas 50 mensagens |
| POST | `/api/whatsapp/enviar` | `{telefone, texto}` — envia pela Evolution API |
| POST | `/webhook/whatsapp` | Recebe da Evolution API; cria o lead se o número for novo |

Etapas do funil: `novo`, `contato`, `proposta`, `ganho`, `perdido`.

### Exemplos

```bash
curl -X POST localhost:3333/api/leads \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Carlos","telefone":"5511999998888","valor":900,"origem":"site"}'

curl -X POST localhost:3333/api/produtos/1/movimentar \
  -H 'Content-Type: application/json' \
  -d '{"tipo":"saida","quantidade":5,"motivo":"venda"}'
```

## Integrações

**n8n** — preencha `N8N_WEBHOOK_URL`. O CRM faz `POST` com
`{ evento, dados, em }`. Eventos: `lead.criado`, `lead.etapa_alterada`,
`estoque.abaixo_do_minimo`, `whatsapp.mensagem_recebida`.
Falha de integração vira log, nunca erro para o usuário.

**WhatsApp (Evolution API)** — preencha `EVOLUTION_URL`, `EVOLUTION_API_KEY` e
`EVOLUTION_INSTANCE`. Na Evolution, aponte o webhook de mensagem para
`https://seu-crm/webhook/whatsapp`.

O workflow de exemplo está em `n8n/crm-automarketing.json` — importe no n8n e troque
as variáveis indicadas no topo.

## Ligar um site ao CRM

Aponte o formulário para `POST /api/leads` com `{ nome, telefone, email, origem }`.

## Limites desta versão

Persistência em arquivo JSON e sem autenticação — é a versão funcional mínima.
Antes de expor na internet: coloque atrás de autenticação, restrinja `CORS_ORIGIN`
e troque o `src/db.js` por Postgres.
