# Onboarding

Na primeira instalação em um projeto, o CLI faz cinco perguntas antes de copiar qualquer
arquivo. O objetivo é duplo: **sugerir as ferramentas certas** e **gravar o contexto do
cliente uma vez só**, para nenhuma skill precisar perguntar de novo depois.

---

## As cinco perguntas

### 1. Este projeto é para quem?

```
❯ ● Para um cliente meu
  ○ Para mim / meu próprio negócio
```

Muda o texto das perguntas seguintes ("Nome do cliente" vs. "Nome do seu projeto",
"Quem é o cliente dele" vs. "Quem é o seu cliente") e o título do arquivo gerado
("Perfil do cliente" vs. "Perfil do projeto").

### 2. Nome do cliente / do projeto

Campo de texto. O padrão sugerido é o nome da pasta — enter aceita.

### 3. Que tipo de negócio é?

Determina as ferramentas que já vêm marcadas na pergunta 5:

| Tipo de negócio | Já vem marcado |
|---|---|
| Prestação de serviço | CRM, Site, Redes Sociais |
| Venda de produto / e-commerce | CRM, n8n, Redes Sociais |
| Negócio local (loja, clínica, salão) | CRM, Redes Sociais, Site |
| Infoproduto / educação | Blog, Redes Sociais, Site |
| Software / SaaS | Dev Sênior, Arquitetura, Coolify |
| Outro | nada marcado |

É só um ponto de partida — dá para marcar e desmarcar tudo na pergunta seguinte.

### 4. Quem é o cliente dele, em uma frase

Campo de texto, opcional (enter grava "não informado"). Alimenta as skills de conteúdo,
que sem isso perguntariam a mesma coisa.

### 5. Quais ferramentas você precisa neste projeto?

O menu de seleção múltipla, com as sugestões da pergunta 3 já marcadas:

```
  5. Quais ferramentas você precisa neste projeto?
  ↑/↓ mover · espaço marcar · a marcar tudo · enter confirmar
❯ ◯ Criação de Blog                          [skill]
  ◯ Criação de Site                          [skill]
  ◉ Redes Sociais                            [skill]
  ◉ n8n                                      [skill]
  ◯ Coolify                                  [skill]
  ◯ Desenvolvedor Sênior                     [agent]
  ◯ Engenheiro de Arquitetura de Software    [agent]
  ◉ CRM Open Source (estoque + WhatsApp...)  [app]
```

Confirmar sem nada marcado encerra sem instalar.

---

## O arquivo gerado

`.automarketing/cliente.md`:

```markdown
# Perfil do cliente

- **Cliente:** Happy Balões
- **Projeto para:** Cliente da Automarketing
- **Negócio:** Venda de produto / e-commerce
- **Público:** mães organizando festa infantil em SP
- **Instalado em:** 2026-08-14

## Ferramentas instaladas
- Redes Sociais (`redes-sociais`)
- n8n (`n8n`)
- CRM Open Source (estoque + WhatsApp + n8n) (`crm`)

## Marca
- **Tom de voz:**
- **Cores:**
- **Nunca dizer:**
- **Site atual:**
- **WhatsApp:**
```

A seção **Marca** nasce em branco de propósito: preencha na primeira conversa com o
cliente e as skills de conteúdo param de perguntar tom de voz e cores a cada peça.

---

## Como as skills usam esse arquivo

As cinco skills começam com esta instrução:

> **Antes de perguntar qualquer coisa, leia `.automarketing/cliente.md`** — o onboarding
> do `npx automarketing` já registrou cliente, tipo de negócio, objetivo e público.
> Só pergunte o que faltar lá, e grave a resposta nova no arquivo.

O efeito prático: o cliente responde o briefing uma vez, não uma vez por squad. E o
arquivo vai ficando mais completo conforme você trabalha.

Você pode editar `cliente.md` à mão a qualquer momento — é markdown comum.

---

## Quando o onboarding roda (e quando não)

| Situação | Onboarding |
|---|---|
| Primeira vez no projeto | ✅ roda |
| Já existe `.automarketing/cliente.md` | ⏭️ pulado, mostra o perfil salvo |
| `--onboarding` | ✅ força refazer |
| `--sem-onboarding` | ⏭️ pulado |
| `--all` ou `add <ids>` | ⏭️ pulado (são os modos "sem perguntas") |

Quando é pulado por já ter perfil, o CLI avisa qual perfil está usando:

```
Perfil já configurado: Happy Balões · Venda de produto / e-commerce
Use --onboarding para refazer as perguntas.
```

⚠️ `--onboarding` **sobrescreve** o `cliente.md` existente, inclusive a seção Marca
preenchida. Se só quer mudar um campo, edite o arquivo direto.
