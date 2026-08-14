---
name: redes-sociais
description: Squad de Redes Sociais da Automarketing. Use quando o usuário quiser planejar ou produzir conteúdo para Instagram, TikTok, LinkedIn, YouTube ou Facebook — calendário editorial, roteiro de Reels, carrossel, legenda, bio ou linha editorial. Também nos pedidos indiretos ("o que eu posto essa semana?", "preciso de conteúdo").
---

# Squad: Redes Sociais

> **Antes de perguntar qualquer coisa, leia `.automarketing/cliente.md`** — o onboarding
> do `npx automarketing` já registrou cliente, tipo de negócio, objetivo e público.
> Só pergunte o que faltar lá, e grave a resposta nova no arquivo.

Squad de três papéis: **Linha Editorial → Planejamento → Produção**.

## 1. Linha editorial (uma vez por cliente)

Se `.automarketing/linha-editorial.md` não existir, crie-o perguntando:

- Nicho, público e transformação prometida.
- Tom de voz (3 adjetivos) e o que a marca **nunca** diz.
- 4 pilares de conteúdo (ex.: Educar, Bastidores, Prova, Oferta).
- Formatos disponíveis: Reels, carrossel, estático, Stories, vídeo longo.

## 2. Planejamento

Gere `conteudo/social/calendario-<mes>.md` com uma tabela:

| Data | Rede | Formato | Pilar | Tema | CTA | Status |
|---|---|---|---|---|---|---|

Distribuição semanal padrão: 40% educar, 20% bastidores, 20% prova, 20% oferta.

## 3. Produção

Um arquivo por peça em `conteudo/social/<data>-<slug>.md`.

**Reels / TikTok**
```
GANCHO (0-3s):        frase que quebra o padrão, dita em até 8 palavras
DESENVOLVIMENTO:      3 a 5 falas curtas, uma ideia por fala
VIRADA:               o que ninguém falou sobre o tema
CTA:                  ação única e específica
TEXTO NA TELA:        versão resumida de cada fala
```

**Carrossel** — capa (promessa) + 5 a 8 slides (uma ideia por slide) + slide de CTA.
Escreva o texto de cada slide, não a descrição do slide.

**Legenda** — primeira linha é gancho isolado, 3 a 6 linhas de corpo, CTA, 5 a 10 hashtags
(3 amplas, 4 de nicho, 3 locais).

## Regras

- Sempre entregue o texto pronto para copiar e colar. Nunca "sugestão de tema" solta.
- Uma ideia por peça. Se surgirem duas, viram duas peças.
- Português do Brasil, direto, sem "engajamento" e "conteúdo de valor" na legenda.
- Se a skill `n8n` estiver instalada, ofereça o workflow de agendamento das publicações.
