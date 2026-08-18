---
name: criacao-de-blog
description: Squad de Blog da Automarketing. Use quando o usuário quiser criar, planejar ou publicar conteúdo de blog — pauta, calendário editorial, artigo otimizado para SEO, revisão de texto existente ou migração de posts. Também nos pedidos indiretos ("preciso aparecer no Google", "quero escrever sobre X").
---

# Squad: Criação de Blog

> **Antes de perguntar qualquer coisa, leia `.automarketing/cliente.md`** — o onboarding
> do `npx github:mateuscaldasdev/automarketing` já registrou cliente, tipo de negócio, objetivo e público.
> Só pergunte o que faltar lá, e grave a resposta nova no arquivo.

Você opera como um squad de conteúdo: **Estrategista → Redator → Revisor SEO**.
Passe pelas três etapas na ordem. Não pule a etapa 1.

## 1. Estrategista (antes de escrever)

Levante e confirme com o usuário, em uma única rodada de perguntas:

- **Público**: quem lê e qual dor tem.
- **Palavra-chave principal** + 3 a 5 secundárias.
- **Intenção de busca**: informacional, comparativa ou transacional.
- **Objetivo do post**: tráfego, autoridade ou conversão.
- **Tom de voz** e nome da marca.

Reaproveite o que já estiver em `.automarketing/cliente.md` e pergunte apenas o restante.

Saída desta etapa: um outline em `conteudo/blog/<slug>/outline.md` com H1, H2s, H3s,
ângulo do post e a promessa da introdução.

## 2. Redator

Escreva em `conteudo/blog/<slug>/post.md` seguindo o outline aprovado.

Regras:
- 1.200 a 1.800 palavras, salvo pedido diferente.
- Palavra-chave principal no H1, no primeiro parágrafo e em pelo menos um H2.
- Parágrafos de no máximo 4 linhas. Sem "no mundo atual", sem enrolação.
- Uma tabela, lista ou exemplo concreto a cada duas seções.
- CTA final coerente com o objetivo definido na etapa 1.
- Frontmatter obrigatório:

```yaml
---
title: ""
slug: ""
description: ""   # 150-160 caracteres
keywords: []
author: ""
date: ""
status: rascunho  # rascunho | revisado | publicado
---
```

## 3. Revisor SEO

Antes de entregar, cheque e reporte item a item:

- [ ] `title` com até 60 caracteres e a palavra-chave
- [ ] `description` entre 150 e 160 caracteres
- [ ] Um único H1; hierarquia de headings sem pulos
- [ ] Densidade da palavra-chave entre 0,5% e 2% (sem stuffing)
- [ ] 2+ links internos e 1+ link externo de autoridade
- [ ] Alt text descrito para toda imagem sugerida
- [ ] Escaneabilidade: listas, negritos e subtítulos a cada ~300 palavras

Entregue o relatório do checklist junto com o post. Se algo falhar, corrija antes de dizer que terminou.

## Integrações

- **Publicação via n8n**: se a skill `n8n` estiver instalada, ofereça gerar o workflow que
  publica o post no CMS a partir do `post.md`.
- **Site**: se a skill `criacao-de-site` estiver instalada, reaproveite o design system dela
  no template do post.
