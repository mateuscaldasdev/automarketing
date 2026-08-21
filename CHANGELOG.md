# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [0.4.0] — 2026-08-21

### CRM — instala sozinho

- **Acabou o SQL manual.** O CRM cria as tabelas no primeiro boot, com migrações
  numeradas em `supabase/migracoes/`: uma transação por arquivo, versão registrada em
  `schema_versao`, nada destrutivo e `advisory lock` para duas réplicas não migrarem juntas
- Tela `/bem-vindo` no lugar do bloco de SQL de promoção que ninguém lembrava de rodar.
  Ela cria o primeiro administrador e **fecha para sempre** assim que ele existe
- Falha na criação das tabelas não derruba a aplicação: ela sobe e mostra o erro

### CRM — funções novas

- `/crm/estoque` — produtos, saldo, entrada, saída e alerta de mínimo. Histórico
  append-only de verdade (sem permissão de alteração nem exclusão no banco). Saída pode
  deixar saldo negativo de propósito: lançamento retroativo é real
- `/crm/equipe` — convidar funcionário e trocar papel pela tela. Admin não consegue criar
  super admin, senão o cliente enxergaria as outras organizações

### CRM — visual

- Paleta preto e laranja, cantos de 4/6px. O acento deixou de se chamar `--roxo` e virou
  `--acento`: trocar a marca continua sendo mexer só no `:root`

### ⚠️ Mudança de contrato

- **Nova variável obrigatória `DATABASE_URL`.** Quem já instalou precisa acrescentá-la ao
  `.env.local` (Supabase → Settings → Database, **porta 5432**). É o que permite criar as
  tabelas: as chaves `anon` e `service_role` passam por uma camada que não executa DDL.
  É a credencial mais poderosa do pacote — só no servidor, nunca no navegador

## [0.2.0] — 2026-08-14

### Infra

- Skill `cloudflare` — DNS pela API no padrão A (`vps.`) + CNAMEs com proxy desligado,
  idempotente, com comando `checar` que acusa a causa nº 1 de SSL que não emite
- Skill `coolify` reescrita — executa pela API v1 (conferida contra o `openapi.json`
  oficial): cria projeto, sobe stack, define variáveis, cria Postgres, faz deploy e
  acompanha o status
- Stacks no padrão da casa: `n8n.yml` em modo fila (editor + worker + task-runners +
  Postgres + Redis, com editor e webhook em domínios separados) e `evolution-go.yml`
  com MinIO
- Migração de VPS: comando `migrar` para servidores na mesma Coolify (com volumes) e
  `scripts/migrar-vps.sh` para Coolifys diferentes — inventário, backup, restauração e
  conferência, sem nunca apagar nada na origem

## [0.1.0] — 2026-08-14

Primeira versão funcional.

### CLI

- Menu interativo de seleção múltipla, sem dependências (setas, espaço, `a`, enter)
- Onboarding de 5 perguntas na primeira instalação, com sugestões por tipo de negócio
- Geração de `.automarketing/cliente.md`, lido por todas as skills
- Comandos `list`, `add <ids>`, `--all`, `--help`
- Opções `--dir`, `--force`, `--onboarding`, `--sem-onboarding`
- Instalação idempotente: não sobrescreve sem `--force`

### Skills

- `criacao-de-blog` — Estrategista → Redator → Revisor SEO
- `criacao-de-site` — Briefing → Copywriter → Front-end
- `redes-sociais` — Linha editorial → Calendário → Produção
- `n8n` — geração de workflows importáveis
- `coolify` — deploy self-hosted, domínio, SSL e diagnóstico

### Agentes

- `desenvolvedor-senior`
- `engenheiro-arquitetura-software`

### CRM

- Funil kanban de 5 etapas com arrastar e soltar
- Controle de estoque com movimentações, bloqueio de saldo negativo e alerta de mínimo
- WhatsApp via Evolution API: envio e webhook que cria lead automaticamente
- Quatro eventos para o n8n, com falha isolada (integração fora do ar não quebra o CRM)
- Dockerfile, docker-compose e `/health`
- Workflow n8n de exemplo

### Conhecido / não incluído nesta versão

- CRM sem autenticação e com persistência em arquivo JSON
- Webhook sem verificação de assinatura
- Pacote ainda não publicado no npm — rode a partir do clone
