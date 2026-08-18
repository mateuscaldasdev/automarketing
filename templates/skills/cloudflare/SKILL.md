---
name: cloudflare
description: Squad de DNS Cloudflare da Automarketing. Use quando o usuário quiser apontar domínio, criar subdomínio, publicar uma app num endereço, resolver SSL que não emite, DNS que não propaga ou erro 502/525 atrás do Cloudflare. Também nos pedidos indiretos ("quero o painel em painel.cliente.com.br", "o site não abre no domínio", "coloca esse app num subdomínio").
---

# Squad: DNS na Cloudflare

> **Antes de perguntar qualquer coisa, leia `.automarketing/cliente.md`** — o onboarding
> do `npx github:mateuscaldasdev/automarketing` já registrou cliente, tipo de negócio, objetivo e público.
> Só pergunte o que faltar lá, e grave a resposta nova no arquivo.

Você **executa** pela API do Cloudflare — não manda o dev clicar no painel.

---

## O padrão de DNS da Automarketing

Toda VPS segue a mesma topologia. Decore, porque tudo depende dela:

```
vps.dominio.com.br        A       89.167.14.39      somente DNS   ← único registro com IP
editor.dominio.com.br     CNAME   vps.dominio.com.br  somente DNS
api.dominio.com.br        CNAME   vps.dominio.com.br  somente DNS
painel.dominio.com.br     CNAME   vps.dominio.com.br  somente DNS
n8n.dominio.com.br        CNAME   vps.dominio.com.br  somente DNS
crm.dominio.com.br        CNAME   vps.dominio.com.br  somente DNS
```

**Por que assim:**

- **Um único ponto de verdade.** Trocou de servidor? Muda o IP em `vps.` e os 20
  subdomínios acompanham. Sem essa regra, migração vira caçada a registro.
- **Proxy sempre desligado (somente DNS).** Com o proxy laranja ligado, o Let's Encrypt
  da Coolify **não consegue validar o domínio e o SSL não emite**. É a causa nº 1 de
  deploy que sobe mas não abre em HTTPS.
- **CNAME em vez de vários A.** Evita o registro que alguém esqueceu de atualizar e que
  aponta para um servidor morto.

**Nunca** crie um `A` para cada aplicação. **Nunca** deixe o proxy ligado num subdomínio
que a Coolify vai emitir certificado.

---

## Como executar

O script fica em `.claude/skills/cloudflare/scripts/cloudflare.mjs`. Zero dependências.

**Token** (uma vez por conta): Cloudflare → My Profile → API Tokens → Create Token →
permissões **Zone:Zone:Read** e **Zone:DNS:Edit**, escopo na zona do cliente.

```bash
export CLOUDFLARE_API_TOKEN="..."   # no Windows: $env:CLOUDFLARE_API_TOKEN="..."
```

Guarde no `.env` do projeto, nunca no repositório.

```bash
# ver as zonas da conta
node .claude/skills/cloudflare/scripts/cloudflare.mjs zonas

# 1º passo em qualquer cliente novo: o A da VPS
node .claude/skills/cloudflare/scripts/cloudflare.mjs vps cliente.com.br 89.167.14.39

# depois, os subdomínios (quantos quiser de uma vez)
node .claude/skills/cloudflare/scripts/cloudflare.mjs sub cliente.com.br n8n crm painel evolution

# conferir antes de acusar a Coolify
node .claude/skills/cloudflare/scripts/cloudflare.mjs checar cliente.com.br crm

# inventário
node .claude/skills/cloudflare/scripts/cloudflare.mjs listar cliente.com.br
```

O script é **idempotente**: se o registro já existe, ele atualiza em vez de duplicar.
Rodar duas vezes não quebra nada.

O comando `sub` **recusa** criar CNAME se `vps.<dominio>` ainda não existir — evita o
subdomínio órfão que aponta para o nada.

---

## Fluxo completo de um cliente novo

```
1. node .../cloudflare.mjs vps cliente.com.br <IP-da-VPS>
2. node .../cloudflare.mjs sub cliente.com.br n8n crm evolution painel
3. Na Coolify, cada app recebe seu domínio (https://crm.cliente.com.br)
4. node .../cloudflare.mjs checar cliente.com.br crm     ← antes de investigar SSL
5. Aguarde a propagação (normalmente < 5 min) e faça o deploy
```

Se a skill [`coolify`](../coolify/SKILL.md) estiver instalada, o passo 3 também é
executado por API — o par DNS + deploy fecha sem ninguém abrir o navegador.

---

## Diagnóstico

Antes de mexer em qualquer coisa, rode `checar` e confirme a propagação:

```bash
nslookup crm.cliente.com.br
```

| Sintoma | Causa quase sempre | Correção |
|---|---|---|
| SSL não emite na Coolify | **Proxy ligado** no subdomínio | Deixe "somente DNS" (`proxied: false`) |
| Erro 525 / 526 | Proxy ligado e origem sem certificado válido | Desligue o proxy |
| Erro 502 no domínio | DNS certo, container errado | Porta do container ≠ exposta na Coolify |
| "Não resolve" logo após criar | Cache local, TTL | Espere ~5 min; teste com `nslookup` |
| Aponta para servidor antigo | Registro `A` antigo sobrevivendo | `listar` e apague o `A` duplicado; só `vps.` tem IP |
| `Zona não encontrada` | Domínio não está nessa conta ou nameserver não migrou | Confirme os NS no registrador |

**Quando o proxy PODE ficar ligado:** no domínio raiz servindo site estático, quando você
quer WAF e cache do Cloudflare e o certificado não é gerenciado pela Coolify. Em tudo
que a Coolify emitir SSL, mantenha desligado.

---

## Regras

- Um `A` por servidor (`vps.`), nunca um por aplicação.
- Proxy desligado em qualquer host que a Coolify vá certificar.
- Nunca deixe `CLOUDFLARE_API_TOKEN` no repositório — `.env` e `.env.example`.
- Antes de apagar registro, rode `listar` e confirme com o dev. DNS errado tira o
  cliente do ar inteiro.
- Registrou domínio novo? Confirme que os nameservers do Cloudflare já estão no
  registrador antes de tentar qualquer coisa.
