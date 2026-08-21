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
| `/crm/estoque` | Produtos, saldo, entrada e saída, alerta de mínimo |
| `/crm/analytics` | Métricas, funil por etapa e origem dos leads |
| `/crm/captura` | O endpoint para o n8n e o site, com exemplos prontos |
| `/crm/equipe` | Convidar funcionário e trocar papel, sem painel do Supabase |
| `/bem-vindo` | Primeiro acesso: cria o administrador. Fecha depois disso |
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

## Banco — sem SQL nenhum

**O CRM cria as tabelas sozinho no primeiro boot.** Você preenche cinco linhas no
`.env.local`, abre o navegador e cria a sua conta na tela de boas-vindas. Só isso.

As migrações ficam em `supabase/migracoes/`, numeradas e aplicadas em ordem:

```
organizacoes           o cliente
perfis                 usuário do Auth + papel + organização
leads                  o pipeline
movimentacoes_lead     histórico append-only de mudança de etapa
produtos               estoque
movimentacoes_estoque  histórico append-only de entrada, saída e ajuste
convites               equipe
schema_versao          o que já foi aplicado
```

Cada arquivo roda dentro de uma transação, fica registrado em `schema_versao` e **nunca
roda de novo**. Nada é destrutivo — só adição. Um `advisory lock` impede que duas réplicas
migrem ao mesmo tempo no deploy.

Isso exige `DATABASE_URL` no `.env`: as chaves `anon` e `service_role` falam com o Supabase
por uma camada que **não cria tabela**. Use a porta **5432** — o pooler de transação (6543)
não sustenta a trava, e o CRM avisa na tela se você errar.

Falhou a migração? O CRM **sobe assim mesmo** e mostra o erro em `/bem-vindo`. Um CRM que
não abre é pior que um que abre avisando.

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

## Estoque

Controle **interno** do cliente: produtos, entrada, saída, saldo e alerta de mínimo.

Três decisões registradas, para ninguém achar que foram esquecimentos:

- **Não dá baixa automática** quando o lead fecha. Estoque é desligado do funil.
- **Não é ferramenta do agente** — ele não consulta saldo para responder no WhatsApp.
- **Saída pode deixar saldo negativo.** Lançamento retroativo acontece; recusar só ensinaria
  o usuário a inventar uma entrada falsa. A tela mostra em vermelho.

O histórico é append-only de verdade: as tabelas não têm permissão de alteração nem de
exclusão. Correção é lançamento de ajuste, que define o saldo absoluto.

## Limites conhecidos

- O modo demonstração guarda em `localStorage`: é para apresentar, não para usar.
- `POST /api/leads` não tem rate limit. Exposto na internet, vale um limitador na frente.
- Falha na criação das tabelas não bloqueia escrita nas outras telas — com o banco sem
  tabela, a escrita já falha sozinha.
- Configurar o agente, editar prompt e observar conversas ainda não existem.
