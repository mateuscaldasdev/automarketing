# Squad: Redes Sociais

`redes-sociais` · tipo `skill` · instala em `.claude/skills/redes-sociais/SKILL.md`

Squad de três papéis — **Linha Editorial → Planejamento → Produção** — que entrega texto
pronto para copiar e colar, nunca "sugestão de tema" solta.

---

## Quando ativa sozinho

- "o que eu posto essa semana?"
- "monta o calendário de conteúdo do mês"
- "faz um roteiro de Reels sobre X"
- "escreve a legenda desse carrossel"

Para forçar: **"use a skill redes-sociais"**.

---

## O que ele faz, etapa por etapa

### 1. Linha editorial (uma vez por cliente)

Se `.automarketing/linha-editorial.md` não existir, ele cria perguntando: nicho, público,
transformação prometida, tom de voz em 3 adjetivos, o que a marca **nunca** diz, os 4
pilares de conteúdo e os formatos disponíveis.

Feito uma vez, vale para todos os meses seguintes.

### 2. Planejamento

Gera `conteudo/social/calendario-<mes>.md` com a tabela:

| Data | Rede | Formato | Pilar | Tema | CTA | Status |

Distribuição semanal padrão: **40% educar, 20% bastidores, 20% prova, 20% oferta**.

### 3. Produção

Um arquivo por peça em `conteudo/social/<data>-<slug>.md`, no formato certo para cada tipo:

**Reels / TikTok** — gancho de até 8 palavras nos primeiros 3 segundos, 3 a 5 falas de
desenvolvimento, uma virada e o CTA. Inclui o texto que vai na tela.

**Carrossel** — capa com a promessa, 5 a 8 slides com uma ideia cada, slide de CTA.
Ele escreve **o texto de cada slide**, não a descrição do slide.

**Legenda** — primeira linha como gancho isolado, 3 a 6 linhas de corpo, CTA e
5 a 10 hashtags (3 amplas, 4 de nicho, 3 locais).

---

## Regras que o squad segue

- Sempre texto pronto para publicar
- Uma ideia por peça — se surgirem duas, viram duas peças
- Português do Brasil, direto, sem "conteúdo de valor" e "engajamento" na legenda

---

## Integrações

- **[`n8n`](n8n.md)** — se instalado, oferece o workflow de agendamento das publicações.
- **[`criacao-de-blog`](criacao-de-blog.md)** — um post do blog vira carrossel e Reels
  sem refazer a pesquisa.

---

## Como customizar

Em `.claude/skills/redes-sociais/SKILL.md`:

- **Distribuição dos pilares** — a linha dos 40/20/20/20
- **Formatos** — os blocos de Reels, carrossel e legenda
- **Quantidade de hashtags** — a regra 3/4/3
- **Redes** — a skill cobre Instagram, TikTok, LinkedIn, YouTube e Facebook; acrescente
  o que faltar na `description` do frontmatter para ela ativar nesses pedidos também
