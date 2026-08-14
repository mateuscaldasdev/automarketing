# Squad: Criação de Blog

`criacao-de-blog` · tipo `skill` · instala em `.claude/skills/criacao-de-blog/SKILL.md`

Transforma o Claude Code num squad editorial de três papéis, que percorre sempre na
mesma ordem: **Estrategista → Redator → Revisor SEO**.

---

## Quando ativa sozinho

A skill carrega quando o pedido envolve conteúdo de blog. Não precisa chamar pelo nome:

- "preciso escrever um artigo sobre organização de festa infantil"
- "monta a pauta do blog desse mês"
- "revisa esse post aqui, tá bom pro Google?"
- "preciso aparecer nas buscas"

Para forçar: **"use a skill criacao-de-blog"**.

---

## O que ele faz, etapa por etapa

### 1. Estrategista

Antes de escrever qualquer linha, levanta em **uma única rodada de perguntas**: público e
dor, palavra-chave principal e secundárias, intenção de busca, objetivo do post e tom de voz.

O que já estiver em `.automarketing/cliente.md` (gerado pelo onboarding) **não é
perguntado de novo**.

**Entrega:** `conteudo/blog/<slug>/outline.md` com H1, H2s, H3s, o ângulo e a promessa
da introdução. Você aprova o outline antes de gastar tempo com texto.

### 2. Redator

Escreve `conteudo/blog/<slug>/post.md` seguindo o outline aprovado, com regras fixas:

- 1.200 a 1.800 palavras (ajustável no pedido)
- Palavra-chave no H1, no primeiro parágrafo e em ao menos um H2
- Parágrafos de no máximo 4 linhas
- Uma tabela, lista ou exemplo concreto a cada duas seções
- CTA final coerente com o objetivo da etapa 1
- Frontmatter YAML completo (`title`, `slug`, `description`, `keywords`, `author`,
  `date`, `status`)

### 3. Revisor SEO

Roda um checklist item a item e **corrige antes de entregar**:

- `title` até 60 caracteres com a palavra-chave
- `description` entre 150 e 160 caracteres
- Um único H1, hierarquia sem pulos
- Densidade da palavra-chave entre 0,5% e 2%
- 2+ links internos, 1+ externo de autoridade
- Alt text em toda imagem sugerida
- Escaneabilidade a cada ~300 palavras

O relatório do checklist vem junto com o post.

---

## O que você recebe

```
conteudo/blog/<slug>/
  outline.md    estrutura aprovada antes da redação
  post.md       o artigo com frontmatter pronto para o CMS
```

O campo `status` no frontmatter (`rascunho` → `revisado` → `publicado`) serve para você
saber o que já passou pelo revisor.

---

## Integrações

- **[`n8n`](n8n.md)** — se instalado, oferece gerar o workflow que publica o `post.md`
  no CMS do cliente.
- **[`criacao-de-site`](criacao-de-site.md)** — se instalado, reaproveita o design system
  do site no template do post.

---

## Como customizar

O comportamento inteiro está em `.claude/skills/criacao-de-blog/SKILL.md`, em português,
sem código. Edite direto:

- **Tamanho padrão do post** — a linha "1.200 a 1.800 palavras"
- **Estrutura de pastas** — as ocorrências de `conteudo/blog/<slug>/`
- **Regras de SEO** — o checklist da etapa 3
- **Tom** — melhor colocar em `.automarketing/cliente.md`, que vale para todas as skills

Depois de editar, reinicie a sessão do Claude Code.
