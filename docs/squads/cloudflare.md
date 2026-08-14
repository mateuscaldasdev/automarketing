# Squad: DNS na Cloudflare

`cloudflare` · tipo `skill` · instala em `.claude/skills/cloudflare/`

Aponta domínio e subdomínios **pela API**, seguindo o padrão de DNS da Automarketing.
Não devolve instruções de onde clicar no painel.

---

## O padrão

```
vps.dominio.com.br        A       89.167.14.39        somente DNS   ← único com IP
crm.dominio.com.br        CNAME   vps.dominio.com.br  somente DNS
n8n.dominio.com.br        CNAME   vps.dominio.com.br  somente DNS
evolution.dominio...      CNAME   vps.dominio.com.br  somente DNS
```

**Um `A` por servidor, CNAME para todo o resto.** Trocou de VPS? Muda um registro só e
os vinte subdomínios acompanham.

**Proxy sempre desligado** nos hosts que a Coolify vai certificar — com o proxy laranja
ligado, o Let's Encrypt não valida o domínio e o SSL não emite. É a causa nº 1 de
"o deploy subiu mas o site não abre".

---

## Quando ativa sozinho

- "aponta o domínio do cliente"
- "quero o painel em painel.cliente.com.br"
- "o SSL não emite"
- "o site não abre no domínio"

---

## Comandos

O script é `.claude/skills/cloudflare/scripts/cloudflare.mjs`, zero dependências.

```bash
export CLOUDFLARE_API_TOKEN="..."   # Zone:Zone:Read + Zone:DNS:Edit

node .../cloudflare.mjs zonas
node .../cloudflare.mjs vps cliente.com.br 89.167.14.39
node .../cloudflare.mjs sub cliente.com.br n8n crm evolution painel
node .../cloudflare.mjs checar cliente.com.br crm
node .../cloudflare.mjs listar cliente.com.br
node .../cloudflare.mjs apagar cliente.com.br antigo
```

Duas proteções embutidas:

- **Idempotente** — se o registro já existe, atualiza em vez de duplicar. Rodar duas
  vezes não quebra nada.
- **`sub` recusa** criar CNAME se `vps.<dominio>` não existir ainda, evitando o
  subdomínio órfão.

O comando `checar` acusa explicitamente proxy ligado e CNAME apontando para o lugar
errado — rode ele antes de culpar a Coolify.

---

## Integração

Par natural com a skill [`coolify`](coolify.md): DNS primeiro, deploy depois. A ordem
correta de um cliente novo está documentada nas duas skills.

---

## Como customizar

Em `.claude/skills/cloudflare/SKILL.md`:

- **Nome do host base** — hoje `vps.`; troque se sua convenção for outra
- **Tabela de diagnóstico** — acrescente os erros que você já apanhou
- **Quando o proxy pode ficar ligado** — a skill já documenta o caso do domínio raiz
  com site estático
