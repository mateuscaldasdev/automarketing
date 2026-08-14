---
name: criacao-de-site
description: Squad de Site da Automarketing. Use quando o usuário quiser criar ou refazer um site, landing page, página de vendas ou institucional — estrutura, copy, design e deploy. Também nos pedidos indiretos ("preciso de uma página pra captar lead", "meu site tá feio").
---

# Squad: Criação de Site

> **Antes de perguntar qualquer coisa, leia `.automarketing/cliente.md`** — o onboarding
> do `npx automarketing` já registrou cliente, tipo de negócio, objetivo e público.
> Só pergunte o que faltar lá, e grave a resposta nova no arquivo.

Squad de três papéis: **Briefing → Copywriter → Front-end**. Percorra na ordem.

## 1. Briefing (obrigatório antes de qualquer código)

Pergunte de uma vez só:

- Tipo de página: landing de captura, página de vendas, institucional ou catálogo.
- Oferta em uma frase e para quem.
- Ação principal desejada (formulário, WhatsApp, agendamento, compra).
- Provas disponíveis: depoimentos, números, logos, casos.
- Marca: cores, fonte, logo. Se não houver, proponha uma paleta e siga.

Registre o resultado em `.automarketing/briefing-site.md`.

## 2. Copywriter

Estrutura padrão da página (adapte, não invente do zero):

1. **Hero** — promessa específica + subheadline com o "como" + CTA.
2. **Dor** — 3 bullets do problema, na linguagem do cliente.
3. **Solução** — o que é, em uma frase, e 3 benefícios (benefício, não feature).
4. **Prova social** — depoimentos, números, logos.
5. **Como funciona** — 3 passos.
6. **Oferta / preço** — o que inclui e o que o cliente leva.
7. **FAQ** — 5 objeções reais respondidas.
8. **CTA final** — repete a promessa e a ação.

Regras de copy: sem superlativo vazio, número sempre que possível, verbo no imperativo no CTA.

## 3. Front-end

Entregue em `site/`:

```
site/
  index.html
  assets/style.css
  assets/app.js
```

Padrões:
- HTML semântico, uma `<section>` por bloco da estrutura acima.
- CSS com custom properties no `:root` (cores, espaçamentos, raio, fontes) — trocar a marca
  deve ser mexer só no `:root`.
- Mobile-first; testar em 375px, 768px e 1440px.
- Sem framework e sem CDN externo, salvo pedido explícito. Fonte do sistema por padrão.
- Formulário com `action` configurável por variável (webhook do n8n ou endpoint do CRM).
- Lighthouse: mire 90+ em performance e acessibilidade. Imagens com `loading="lazy"` e `alt`.

## 4. Entrega

- Abra o site no navegador e confira antes de dizer que terminou.
- Se a skill `coolify` estiver instalada, ofereça publicar o site.
- Se o `crm` estiver instalado, aponte o formulário para `POST /api/leads` dele.
