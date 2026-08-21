# CRM Automarketing

Pipeline de leads com login, três níveis de acesso e integração com n8n e WhatsApp.
Next.js + Supabase.

## Rodar agora (modo demonstração)

```bash
npm install
npm run dev
```

O endereço aparece no terminal — o Next escolhe uma porta livre sozinho, então não
trava se a 3000 já estiver ocupada.

Sem nenhuma variável configurada, o CRM abre **em modo demonstração**: sem login, com
leads de exemplo e os dados guardados só no navegador. Serve para navegar, apresentar e
ver o visual. Nada é gravado em servidor nenhum.

## Rodar de verdade (com Supabase)

**Não existe SQL para rodar.** O CRM cria as tabelas sozinho no primeiro boot.

1. Crie o projeto — na nuvem (supabase.com) **ou** self-hosted na Coolify (a skill
   `coolify` tem os dois caminhos). O CRM aceita os dois, muda só a URL.
2. `cp .env.example .env.local` e preencha as cinco obrigatórias:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # só no servidor
DATABASE_URL=postgresql://...      # Settings → Database, porta 5432
CRM_API_KEY=...                    # protege POST /api/leads
```

3. Suba o CRM — um comando por linha, porque o PowerShell do Windows não aceita `&&`:

```
npm install
npm run dev
```

4. Abra o endereço que apareceu no terminal e **crie a sua conta na tela de boas-vindas**.

Pronto. A tela de boas-vindas some assim que existe o primeiro administrador.

Sobre o `DATABASE_URL`: é ele que permite criar as tabelas. As chaves `anon` e
`service_role` falam com o Supabase por uma camada que não cria tabela — por isso a conexão
direta. **Use a porta 5432**, não a 6543: o pooler de transação não sustenta a trava que a
instalação precisa, e o CRM avisa na tela se você errar.

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
| `/crm/estoque` | Produtos, saldo, entrada e saída, alerta de mínimo |
| `/crm/analytics` | Métricas, funil por etapa e origem dos leads |
| `/crm/captura` | O endpoint para o n8n e o site, com exemplos prontos |
| `/crm/equipe` | Convidar funcionário e trocar papel, sem passar pelo painel do Supabase |
| `/bem-vindo` | Primeiro acesso: cria o administrador. Some depois disso |
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

## Sobre o estoque

É **controle interno**: produtos, entrada, saída, saldo e alerta de mínimo. De propósito,
não dá baixa automática quando um lead fecha e não é consultado pelo agente — são decisões
registradas, não esquecimentos.

Duas regras que valem conhecer: o histórico é **append-only** (correção é lançamento de
ajuste, nunca edição), e **saída pode deixar saldo negativo** — lançamento retroativo
acontece, e recusar só ensinaria a inventar entrada falsa. A tela mostra em vermelho.

## Limites conhecidos

- O modo demonstração guarda dados em `localStorage` — é para apresentar, não para usar.
- `POST /api/leads` não tem limite de requisições. Exposto na internet, vale colocar um
  rate limit na frente.
- Se a criação das tabelas falhar, o CRM **sobe assim mesmo** e mostra o erro em
  `/bem-vindo`, em vez de não abrir. Ele não bloqueia escrita nas outras telas: com o banco
  sem tabela, a escrita já falha sozinha.
- Configurar o agente, editar prompt e observar conversas ainda não existem — é a próxima
  etapa.
