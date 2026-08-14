# Squad: Criação de Site

`criacao-de-site` · tipo `skill` · instala em `.claude/skills/criacao-de-site/SKILL.md`

Squad de três papéis — **Briefing → Copywriter → Front-end** — que entrega uma página
pronta, rodando e conectada ao que o cliente já tem.

---

## Quando ativa sozinho

- "preciso de uma landing page pra captar lead"
- "faz uma página de vendas pro meu curso"
- "meu site tá feio, refaz"
- "quero uma página com essa cara aqui"

Para forçar: **"use a skill criacao-de-site"**.

---

## O que ele faz, etapa por etapa

### 1. Briefing (obrigatório)

Pergunta de uma vez: tipo de página, oferta em uma frase, ação principal desejada
(formulário, WhatsApp, agendamento, compra), provas disponíveis e marca.
Sem marca definida, ele propõe uma paleta e segue — não trava esperando.

O que já está em `.automarketing/cliente.md` não é perguntado de novo.
O resultado fica em `.automarketing/briefing-site.md`.

### 2. Copywriter

Escreve a copy seguindo uma estrutura de 8 blocos que funciona para a maioria dos casos:

| # | Bloco | O que entra |
|---|---|---|
| 1 | Hero | promessa específica + o "como" + CTA |
| 2 | Dor | 3 bullets na linguagem do cliente |
| 3 | Solução | o que é + 3 benefícios (benefício, não feature) |
| 4 | Prova social | depoimentos, números, logos |
| 5 | Como funciona | 3 passos |
| 6 | Oferta | o que inclui e o que o cliente leva |
| 7 | FAQ | 5 objeções reais |
| 8 | CTA final | repete promessa e ação |

Regras de copy: sem superlativo vazio, número sempre que possível, verbo no imperativo
no CTA.

### 3. Front-end

Entrega em `site/`:

```
site/
  index.html
  assets/style.css
  assets/app.js
```

Padrões que ele segue:

- HTML semântico, uma `<section>` por bloco da estrutura acima
- CSS com custom properties no `:root` — **trocar a marca é mexer só no `:root`**
- Mobile-first, verificado em 375px, 768px e 1440px
- Sem framework e sem CDN externo (a menos que você peça)
- Formulário com destino configurável
- Imagens com `loading="lazy"` e `alt`; meta de 90+ no Lighthouse

---

## Integrações

- **[`crm`](crm.md)** — se instalado, o formulário já aponta para `POST /api/leads`
  do CRM, e o lead cai no funil.
- **[`coolify`](coolify.md)** — se instalado, oferece publicar o site com domínio e SSL.
- **[`criacao-de-blog`](criacao-de-blog.md)** — compartilha o design system com o
  template dos posts.

---

## Entrega

O squad **abre o site no navegador e confere** antes de dizer que terminou. Se pedir
para publicar, a skill `coolify` assume daí.

---

## Como customizar

Tudo em `.claude/skills/criacao-de-site/SKILL.md`:

- **Estrutura da página** — a tabela de 8 blocos
- **Stack** — a regra "sem framework"; troque por Next, Astro ou o que usar
- **Pasta de saída** — as ocorrências de `site/`
- **Breakpoints e meta de performance** — a seção Front-end
