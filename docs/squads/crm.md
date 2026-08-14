# CRM Open Source

`crm` · tipo `app` · instala em `./crm/`

CRM completo que roda na máquina do cliente: funil de vendas, controle de estoque,
WhatsApp e integração com n8n. Escrito em Node puro — **nenhuma dependência de runtime**,
nada de `npm install` demorado, nada de banco para configurar antes de ver funcionando.

---

## Instalação

```bash
npx automarketing add crm
cd crm
cp .env.example .env
npm start
```

Abre em **http://localhost:3333**. No primeiro start ele cria `data/db.json` com
3 leads e 3 produtos de exemplo — a tela já nasce com conteúdo, o que ajuda em demonstração.

Para começar vazio: apague `data/db.json` e reinicie, ou edite a função `seed()` em
[`src/db.js`](../../templates/apps/crm/src/db.js).

---

## As três telas

### Funil (aba padrão)

Kanban de 5 colunas: `novo` → `contato` → `proposta` → `ganho` / `perdido`.

- **Arrastar e soltar** um card muda a etapa. Cada mudança dispara o evento
  `lead.etapa_alterada` no n8n.
- O formulário no topo cria lead na hora (nome é o único campo obrigatório).
- Os cards mostram nome, telefone, origem e valor.

As métricas no topo da página recalculam a cada ação: total de leads, **pipeline aberto**
(soma dos valores fora de ganho/perdido), **receita ganha** (soma dos ganhos), produtos
com estoque baixo e o status das integrações.

### Estoque

Tabela de produtos com SKU, preço, saldo e mínimo. Cada linha tem três botões:

- **+ entrada** — recebimento, devolução, ajuste para cima
- **− saída** — venda, perda, ajuste para baixo
- **excluir**

Duas regras que o CRM garante sozinho:

1. **Saída nunca deixa o saldo negativo.** A API responde `400` com
   `estoque insuficiente: disponível 4, saída 999` e nada é gravado.
2. **Saldo ≤ mínimo dispara `estoque.abaixo_do_minimo` no n8n** — é o gancho para o
   alerta automático de reposição.

Toda movimentação vira uma linha no histórico, com tipo, quantidade, saldo resultante
e motivo. O histórico é append-only: para corrigir um erro, lance a movimentação inversa.

### WhatsApp

Lista as conversas (entrada e saída) e permite enviar mensagem avulsa pela Evolution API.
Mensagens de entrada aparecem com borda roxa; saída, verde.

---

## API HTTP

Todas as respostas são JSON. Erro sempre no formato `{ "erro": "mensagem" }`.

### Leads

| Método | Rota | Corpo | Retorno |
|---|---|---|---|
| `GET` | `/api/leads` | — | array de leads |
| `POST` | `/api/leads` | `{nome*, telefone, email, origem, etapa, valor, obs}` | `201` + lead criado |
| `GET` | `/api/leads/:id` | — | lead ou `404` |
| `PATCH` | `/api/leads/:id` | qualquer campo | lead atualizado |
| `DELETE` | `/api/leads/:id` | — | lead removido |

`*` obrigatório. O telefone é normalizado para dígitos (`(11) 98888-7777` → `11988887777`).
`etapa` fora da lista das 5 válidas devolve `400`.

```bash
curl -X POST localhost:3333/api/leads \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Carlos","telefone":"5511999998888","valor":900,"origem":"site"}'
```

### Produtos e estoque

| Método | Rota | Corpo | Retorno |
|---|---|---|---|
| `GET` | `/api/produtos` | — | array de produtos |
| `POST` | `/api/produtos` | `{nome*, sku, preco, estoque, estoqueMinimo}` | `201` + produto |
| `DELETE` | `/api/produtos/:id` | — | produto removido |
| `POST` | `/api/produtos/:id/movimentar` | `{tipo, quantidade, motivo}` | `{produto, movimentacao}` |
| `GET` | `/api/movimentacoes` | — | últimas 50 |

`tipo` é `entrada` ou `saida`. Sem SKU informado, é gerado um automaticamente.

```bash
curl -X POST localhost:3333/api/produtos/1/movimentar \
  -H 'Content-Type: application/json' \
  -d '{"tipo":"saida","quantidade":5,"motivo":"venda balcão"}'
```

### WhatsApp

| Método | Rota | Corpo |
|---|---|---|
| `POST` | `/api/whatsapp/enviar` | `{telefone*, texto*}` |
| `POST` | `/webhook/whatsapp` | payload cru da Evolution API |
| `GET` | `/api/mensagens` | últimas 50 |

### Utilitárias

| Método | Rota | Para quê |
|---|---|---|
| `GET` | `/health` | healthcheck da Coolify/Docker — `{"status":"ok"}` |
| `GET` | `/api/metricas` | números do topo da tela + status das integrações |

---

## Integração com n8n

Preencha `N8N_WEBHOOK_URL` no `.env`. O CRM passa a fazer `POST` nessa URL a cada
evento, com o corpo:

```json
{ "evento": "lead.criado", "dados": { ... }, "em": "2026-08-14T15:25:59.944Z" }
```

| Evento | Quando dispara | `dados` contém |
|---|---|---|
| `lead.criado` | novo lead por qualquer via | o lead |
| `lead.etapa_alterada` | card muda de coluna | `{lead, etapaAnterior}` |
| `estoque.abaixo_do_minimo` | saldo ≤ mínimo após movimentação | o produto |
| `whatsapp.mensagem_recebida` | mensagem de número já conhecido | `{lead, mensagem}` |

**Falha de integração nunca quebra o CRM.** Se o n8n estiver fora do ar, o erro vai
para o log (`[n8n] falha ao enviar lead.criado: ...`) e a requisição do usuário
continua respondendo `200`. Essa decisão está em
[`src/integracoes.js`](../../templates/apps/crm/src/integracoes.js).

O workflow de exemplo está em `crm/n8n/crm-automarketing.json` — importe no n8n, ele já
roteia por evento e manda WhatsApp de boas-vindas ao lead novo e alerta de estoque ao gestor.

---

## Integração com WhatsApp (Evolution API)

Preencha no `.env`:

```
EVOLUTION_URL=https://evolution.seuservidor.com.br
EVOLUTION_API_KEY=sua-chave
EVOLUTION_INSTANCE=nome-da-instancia
```

**Enviando:** o CRM chama `POST {EVOLUTION_URL}/message/sendText/{INSTANCE}` com o header
`apikey`.

**Recebendo:** configure na Evolution o webhook de mensagem apontando para
`https://seu-crm/webhook/whatsapp`. A cada mensagem recebida o CRM:

1. Ignora se for mensagem enviada por você mesmo (`fromMe: true`).
2. Extrai telefone, texto e nome do payload (aceita `conversation` e
   `extendedTextMessage`).
3. Grava a mensagem no histórico.
4. **Procura o telefone entre os leads. Se não existir, cria um lead novo** com origem
   `whatsapp`, etapa `novo` e o texto da mensagem nas observações.
5. Dispara o evento no n8n.

Ou seja: quem mandar mensagem no WhatsApp da empresa aparece no funil sozinho.

---

## Modelo de dados

Tudo em `data/db.json`. Estruturas:

```js
lead        { id, nome, telefone, email, origem, etapa, valor, obs, criadoEm, atualizadoEm }
produto     { id, sku, nome, preco, estoque, estoqueMinimo, criadoEm }
movimentacao{ id, produtoId, sku, tipo, quantidade, saldo, motivo, em }
mensagem    { id, direcao, telefone, texto, entregue, detalhe, em }
```

---

## Deploy

### Docker

```bash
docker compose up -d
```

O volume `crm-data` preserva o banco entre reinícios.

### Coolify

1. New Resource → Docker Compose (ou repositório com o Dockerfile).
2. Cole as variáveis do `.env.example` em Environment Variables.
3. Domínio em Domains; o SSL é automático.
4. O healthcheck em `/health` já está configurado no Dockerfile.

A skill [`coolify`](coolify.md) tem o passo a passo completo e a tabela de erros comuns.

---

## Estrutura dos arquivos

```
crm/
  server.js              HTTP, arquivos estáticos, .env, tratamento de erro
  src/db.js              carrega/salva o JSON, dados de exemplo, IDs sequenciais
  src/rotas.js           toda a regra de negócio e o roteador
  src/integracoes.js     n8n e Evolution API (o único lugar que fala com fora)
  public/index.html      a interface inteira (HTML + CSS + JS em um arquivo)
  n8n/                   workflow de exemplo
  Dockerfile             build de produção com healthcheck
  docker-compose.yml     app + volume de dados
```

Para trocar a persistência por Postgres, o alvo é `src/db.js` — `rotas.js` só usa
`load()`, `save()` e `nextId()`.

---

## Limites desta versão

Isto é a versão funcional mínima, e vale ser honesto sobre o que ela não é:

- **Sem autenticação.** Qualquer um que alcançar a porta usa o CRM inteiro.
- **Persistência em arquivo JSON**, carregado em memória. Ótimo até alguns milhares de
  registros; não é para volume alto nem para dois processos gravando ao mesmo tempo.
- **Sem multiusuário, sem permissões, sem histórico de quem fez o quê.**
- **Webhook sem verificação de assinatura** — quem souber a URL consegue criar lead.

Antes de expor na internet: coloque atrás de autenticação, restrinja `CORS_ORIGIN` ao
domínio do site, valide a origem do webhook e troque `src/db.js` por Postgres.
