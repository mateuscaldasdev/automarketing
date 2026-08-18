# CRM Open Source

`crm` · tipo `app` · instala em `./crm/`

Pipeline de leads com login, três níveis de acesso e integração com n8n e WhatsApp.
Next.js 16 + Supabase.

---

## Rodar em 30 segundos (modo demonstração)

```bash
npx github:mateuscaldasdev/automarketing add crm
cd crm
npm install
npm run dev
```

Um comando por linha: o PowerShell do Windows não aceita `&&`. O endereço aparece no
terminal quando o servidor sobe — o Next escolhe uma porta livre sozinho.

Sem nenhuma variável configurada ele abre **em modo demonstração**: sem login, com leads
de exemplo, dados só no navegador. É para navegar e apresentar — nada vai para servidor.

Preencheu o Supabase, vira o CRM de verdade: login, multi-organização e RLS.

---

## As telas

| Rota | O que faz |
|---|---|
| `/crm` | Pipeline kanban com arrastar e soltar, busca e filtro por origem |
| `/crm/clientes` | Tabela com contato, origem, etapa, score e valor |
| `/crm/analytics` | Métricas, funil por etapa e origem dos leads |
| `/crm/captura` | O endpoint para o n8n e o site, com exemplos prontos |
| `/login` | E-mail e senha (pulado no modo demo) |

Sete etapas: `novo` → `contato` → `qualificado` → `reuniao` → `proposta` →
`ganho` / `perdido`. Arrastar o card grava a mudança **e registra quem moveu e quando**.

O movimento é otimista: o card anda na tela na hora e volta sozinho se a gravação falhar.

---

## Os três papéis

| Papel | Quem é | O que pode |
|---|---|---|
| `super_admin` | o dev | tudo, em todas as organizações |
| `admin` | o cliente | administra a própria organização, a equipe e apaga leads |
| `usuario` | funcionário | trabalha os leads da organização, sem configurar nem apagar |

**O isolamento entre clientes é RLS no Postgres, não no front-end.** Mesmo chamando a API
direto com a chave anônima, cada um só enxerga a própria organização.

Duas travas que valem citar:

- Um usuário **não consegue mudar o próprio papel** — trigger `travar_autopromocao`.
- As funções de permissão são `security definer` de propósito: sem isso, a policy de
  `perfis` consultaria `perfis` e entraria em recursão infinita.

---

## Captura: como o lead do n8n entra

```bash
curl -X POST https://crm.cliente.com.br/api/leads \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $CRM_API_KEY" \
  -d '{"nome":"Maria Souza","telefone":"5511988887777","origem":"WhatsApp","score":60}'
```

Cai direto na coluna **Novos leads**. A rota grava com a `service_role` (ignora RLS),
então **a `CRM_API_KEY` é o que a protege** — sem ela definida, a rota fica desabilitada
de propósito, em vez de ficar aberta.

É o ponto de encontro do pacote: o agente do WhatsApp no n8n, o formulário do site feito
pela skill `criacao-de-site` e a captura manual entram todos por aqui.

---

## Banco

`supabase/schema.sql`, idempotente, com quatro tabelas:

```
organizacoes         o cliente
perfis               usuário do Auth + papel + organização
leads                o pipeline
movimentacoes_lead   histórico append-only de mudança de etapa
```

Rode uma vez no SQL Editor. No fim do arquivo há o bloco de primeiro acesso, que cria a
organização e promove você a `super_admin` — **sem ele ninguém enxerga nada**, porque a
RLS está funcionando.

---

## Deploy

`Dockerfile` em modo `standalone`. Com as skills do pacote:

```bash
node .../cloudflare.mjs sub cliente.com.br crm
node .../coolify.mjs stack ... --dominio https://crm.cliente.com.br
node .../coolify.mjs env <uuid> NEXT_PUBLIC_SUPABASE_URL=... CRM_API_KEY=...
node .../coolify.mjs deploy <uuid>
```

O Supabase pode ser da nuvem ou self-hosted na Coolify — muda só a URL.

---

## Trocar a marca

Todas as cores são custom properties no `:root` de `app/globals.css`. Trocar a paleta do
cliente é mexer só ali — o resto do CSS referencia as variáveis.

---

## Limites conhecidos

- O modo demonstração guarda em `localStorage`: é para apresentar, não para usar.
- Não há tela de gestão de equipe — convidar usuário e trocar papel é pelo painel do
  Supabase ou por SQL.
- `POST /api/leads` não tem rate limit. Exposto na internet, vale um limitador na frente.
- O controle de estoque da v1 saiu nesta versão; o foco virou o pipeline.
