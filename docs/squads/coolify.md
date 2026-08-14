# Squad: Infra na Coolify

`coolify` · tipo `skill` · instala em `.claude/skills/coolify/SKILL.md`

Deixa a aplicação pronta para subir com um clique na Coolify, com domínio e HTTPS
funcionando — e sabe diagnosticar quando o deploy falha.

---

## Quando ativa sozinho

- "publica esse site"
- "sobe isso no meu servidor"
- "o deploy tá dando 502"
- "como conecto o banco na Coolify?"

Para forçar: **"use a skill coolify"**.

---

## O que ele faz

### 1. Prepara a aplicação

Garante o que a Coolify precisa para funcionar:

- `Dockerfile` **ou** `docker-compose.yml` na raiz
- Porta por variável (`PORT`), nunca fixa em código
- `.env.example` com **todas** as variáveis, sem valores reais
- Healthcheck em `/health` devolvendo `200`

A skill traz um `Dockerfile` de referência para Node, já com `HEALTHCHECK`.

### 2. Cria o recurso

Orienta a escolha entre repositório com Dockerfile, Docker Compose colado ou Service
pronto (n8n, Postgres, Redis, MinIO), e recomenda ativar o auto-deploy **só depois do
primeiro deploy verde**.

### 3. Variáveis de ambiente

Cola o `.env.example` em Environment Variables e marca como Build Variable só o que o
build precisa.

### 4. Domínio e SSL

O ponto onde mais gente trava, e a skill avisa antes: registro `A` apontando para o IP e
**proxy do Cloudflare desligado no primeiro deploy** — com o proxy ligado, o Let's Encrypt
não emite.

### 5. Banco de dados

Recurso separado, na mesma rede, conectado pela **string interna**
(`postgres://user:pass@nome-do-servico:5432/db`), sem expor porta pública. Backup
automático ativado.

---

## Tabela de diagnóstico

O que a skill consulta quando algo quebra:

| Sintoma | Onde olhar |
|---|---|
| Build falha | Logs de build — quase sempre dependência faltando no `package.json` |
| Sobe e cai | Logs do container — variável de ambiente ausente |
| 502 no domínio | Porta do container ≠ porta exposta na Coolify |
| SSL não emite | DNS não propagado ou proxy do Cloudflare ligado |
| App não fala com o banco | Usando host público em vez do nome do serviço interno |

---

## Checklist de entrega

- [ ] Deploy verde e `/health` respondendo pelo domínio
- [ ] HTTPS válido, HTTP redirecionando
- [ ] Variáveis preenchidas e nenhuma no repositório
- [ ] Backup do banco ativo
- [ ] Credenciais entregues por canal seguro

---

## Integração com o CRM

O [`crm`](crm.md) já vem com `Dockerfile`, `docker-compose.yml` e `/health` prontos
exatamente nesse padrão — é `New Resource` → colar variáveis → domínio.

---

## Como customizar

Em `.claude/skills/coolify/SKILL.md`:

- **Dockerfile de referência** — troque se sua stack padrão não for Node
- **Tabela de diagnóstico** — acrescente os erros que você já apanhou; é a parte que
  mais economiza tempo depois
- **Outra plataforma** — a estrutura serve para Dokploy, CapRover ou VPS na unha;
  ajuste os nomes de menu
