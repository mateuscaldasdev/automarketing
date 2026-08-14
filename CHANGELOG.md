# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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
