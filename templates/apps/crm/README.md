# CRM Automarketing

Pipeline de leads com login, três níveis de acesso e integração com n8n e WhatsApp.
Next.js + Supabase.

## Rodar agora (modo demonstração)

```bash
npm install
npm run dev
# http://localhost:3333
```

Sem nenhuma variável configurada, o CRM abre **em modo demonstração**: sem login, com
leads de exemplo e os dados guardados só no navegador. Serve para navegar, apresentar e
ver o visual. Nada é gravado em servidor nenhum.

## Rodar de verdade (com Supabase)

1. Crie o projeto — na nuvem (supabase.com) **ou** self-hosted na Coolify (a skill
   `coolify` tem os dois caminhos). O CRM aceita os dois, muda só a URL.
2. No SQL Editor, rode [`supabase/schema.sql`](supabase/schema.sql) inteiro.
3. `cp .env.example .env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # só no servidor
CRM_API_KEY=...                    # protege POST /api/leads
```

4. Crie seu usuário em Authentication → Users.
5. Rode o bloco comentado no fim do `schema.sql` para criar a organização e te promover
   a `super_admin`. **Sem isso ninguém enxerga nada** — é a RLS fazendo o trabalho dela.

## Os três papéis

| Papel | Quem é | O que pode |
|---|---|---|
| `super_admin` | você, o dev | tudo, em todas as organizações |
| `admin` | seu cliente | administra a própria organização, a equipe e apaga leads |
| `usuario` | funcionário do cliente | trabalha os leads da organização, sem configurar nem apagar |

O isolamento entre clientes é feito por **RLS no Postgres**, não no front-end: mesmo que
alguém chame a API direto com a chave anônima, só vê a própria organização.

Duas travas que valem citar: um usuário **não consegue mudar o próprio papel** (trigger
`travar_autopromocao`), e toda mudança de etapa vira linha em `movimentacoes_lead`, com
quem moveu e quando.

## Telas

| Rota | O que faz |
|---|---|
| `/crm` | Pipeline kanban, arrastar e soltar entre 7 etapas, busca e filtro por origem |
| `/crm/clientes` | Tabela com contato, origem, etapa, score e valor |
| `/crm/analytics` | Métricas, funil por etapa e origem dos leads |
| `/crm/captura` | O endpoint para o n8n e o site, com exemplos prontos |
| `/login` | Entrada por e-mail e senha (redireciona para `/crm` no modo demo) |

## Receber lead do n8n

```bash
curl -X POST https://crm.cliente.com.br/api/leads \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $CRM_API_KEY" \
  -d '{"nome":"Maria Souza","telefone":"5511988887777","origem":"WhatsApp","score":60}'
```

O lead cai direto na coluna **Novos leads**. É por aqui que os agentes do n8n e o
formulário do site entram — a tela `/crm/captura` mostra o mesmo com exemplos.

A rota grava com a `service_role` (ignora RLS), então **a `CRM_API_KEY` é o que a
protege**. Sem ela definida, a rota fica desabilitada de propósito.

## Deploy na Coolify

O `Dockerfile` usa o modo `standalone` do Next. Pela skill `coolify`:

```bash
node .../cloudflare.mjs sub cliente.com.br crm
node .../coolify.mjs stack ... --dominio https://crm.cliente.com.br
node .../coolify.mjs env <uuid> NEXT_PUBLIC_SUPABASE_URL=... CRM_API_KEY=...
node .../coolify.mjs deploy <uuid>
```

## Trocar a marca

Todas as cores são custom properties no `:root` de [`app/globals.css`](app/globals.css).
Trocar a paleta do cliente é mexer só ali.

## Limites conhecidos

- O modo demonstração guarda dados em `localStorage` — é para apresentar, não para usar.
- Não há tela de gestão de equipe ainda: convidar usuário e trocar papel é pelo painel do
  Supabase ou por SQL.
- `POST /api/leads` não tem limite de requisições. Exposto na internet, vale colocar um
  rate limit na frente.
