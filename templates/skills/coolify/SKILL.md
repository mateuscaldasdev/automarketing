---
name: coolify
description: Squad de Infra Coolify da Automarketing. Use quando o usuário quiser publicar, hospedar ou fazer deploy de uma aplicação self-hosted — Coolify, Docker, docker-compose, domínio, SSL, variáveis de ambiente, banco gerenciado ou troubleshooting de deploy.
---

# Squad: Infra na Coolify

> **Antes de perguntar qualquer coisa, leia `.automarketing/cliente.md`** — o onboarding
> do `npx automarketing` já registrou cliente, tipo de negócio, objetivo e público.
> Só pergunte o que faltar lá, e grave a resposta nova no arquivo.

Entrega padrão: a aplicação **sobe com um clique** na Coolify, com domínio e HTTPS.

## 1. Prepare a aplicação

Toda app que vai para a Coolify precisa de:

- `Dockerfile` **ou** `docker-compose.yml` na raiz.
- Porta exposta por variável (`PORT`), nunca fixa em código.
- `.env.example` listando **todas** as variáveis, sem valores reais.
- Healthcheck em `/health` retornando `200` e JSON `{ "status": "ok" }`.

`Dockerfile` de referência (Node):

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:$PORT/health || exit 1
CMD ["npm", "start"]
```

## 2. Crie o recurso na Coolify

1. **Project** → New Resource → escolha a origem:
   - `Public/Private Repository` para app com Dockerfile.
   - `Docker Compose` colando o compose.
   - `Service` para stacks prontas (n8n, Postgres, Redis, MinIO).
2. Build Pack: `Dockerfile` ou `Docker Compose`.
3. Branch: `main`. Ative *Auto Deploy on push* só depois do primeiro deploy verde.

## 3. Variáveis de ambiente

Cole o conteúdo do `.env.example` em **Environment Variables** e preencha os valores.
Marque como *Build Variable* apenas o que o build precisa. Segredo nunca vai para o git.

## 4. Domínio e SSL

- Em **Domains**, informe `https://app.cliente.com.br`.
- No DNS do cliente: registro `A` apontando para o IP do servidor, proxy **desligado** no
  primeiro deploy (Cloudflare em "DNS only") — senão o Let's Encrypt falha.
- SSL é automático. Se não emitir: confira a propagação do DNS e refaça o deploy.

## 5. Banco de dados

Crie como recurso separado (`Postgres`), na mesma rede do projeto, e conecte a app pela
**string interna** (`postgres://user:pass@nome-do-servico:5432/db`) — não exponha a porta pública.
Ative backup automático em **Backups**.

## 6. Deu erro? Nesta ordem

| Sintoma | Onde olhar |
|---|---|
| Build falha | Logs de build — quase sempre dependência faltando no `package.json` |
| Sobe e cai | Logs do container — variável de ambiente ausente |
| 502 no domínio | Porta do container ≠ porta exposta na Coolify |
| SSL não emite | DNS não propagado ou proxy do Cloudflare ligado |
| App não fala com o banco | Usando host público em vez do nome do serviço interno |

## Checklist de entrega

- [ ] Deploy verde e `/health` respondendo pelo domínio
- [ ] HTTPS válido, HTTP redirecionando
- [ ] Variáveis preenchidas e nenhuma no repositório
- [ ] Backup do banco ativo
- [ ] Credenciais entregues ao cliente por canal seguro
