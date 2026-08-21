---
name: agente
description: Squad de Agente Conversacional da Automarketing. Use quando o usuário quiser
  criar, adaptar, corrigir ou entender o agente de atendimento — mudar o jeito que ele fala,
  acrescentar ou remover etapa do funil, ligar uma ferramenta nova, ajustar o classificador
  que decide a etapa, ou gerar o fluxo para o n8n. Também nos pedidos indiretos ("o bot está
  respondendo errado", "quero que ele fale como a minha empresa", "ele não entende quando
  perguntam preço", "preciso de uma etapa a mais antes da proposta").
---

# Squad: Agente Conversacional

> **Antes de perguntar qualquer coisa, leia `.automarketing/cliente.md`** — o onboarding do
> `npx github:mateuscaldasdev/automarketing` já registrou cliente, tipo de negócio, objetivo e
> público. Só pergunte o que faltar lá, e grave a resposta nova no arquivo.

O agente instalado vive em `agente/`. **A estrutura é lei; o conteúdo é do cliente.**

## O que é livre e o que não é

| Livre | Fixo |
|---|---|
| nome, tom e personalidade | os quatro blocos de cada prompt |
| quantas etapas, com que nomes | o classificador devolver só um token |
| quais ferramentas | o enum ser gerado, não digitado |
| o canal | existir um destino seguro |
| todo o texto | `[[ ]]` como marcador, nunca `{{ }}` |

Quando o pedido quebrar a coluna da direita, **explique e recuse**. Quando estiver na
esquerda, faça sem opinar sobre o negócio do cliente.

## A entrevista, quando for adaptar do zero

Cinco perguntas, uma por vez. Cada uma vira uma parte concreta do manifesto:

1. **Qual o caminho normal, do primeiro "oi" até o fechamento?** → as `etapas`, em ordem
2. **Onde o cliente costuma sair desse caminho?** → os `desvios`
3. **O que o agente precisa consultar ou gravar?** → as `tools` e seus `status`
4. **Como esse negócio fala?** → a identidade e o tom
5. **O que ele nunca pode dizer?** → as regras de proibição

A quinta é a mais subestimada e ninguém oferece sozinho. É dela que sai o tipo de trava que
salva venda — no modelo que vem instalado, é "nunca fale preço no chat, remeta à proposta".
Todo nicho tem a sua. **Pergunte.**

## Como mexer

### Mudar o jeito de falar

Edite `<regras>` e `<interacao>` do ramo. As Situações trazem o texto literal — reescreva
com as palavras do cliente, mantendo uma Situação por caso.

### Acrescentar uma etapa

1. Acrescente em `etapas:` no `agente.yml`, na posição certa do funil: `id`, `token`,
   `prompt`, `tools`
2. Crie `prompts/etapa-<id>.md` copiando a estrutura de um ramo existente
3. Descreva a etapa nova no `<funil>` do classificador — **qual sinal no histórico** a
   identifica, não o que ela faz
4. Acrescente pelo menos um exemplo em `### Exemplos`
5. `node agente/scripts/agente.mjs gerar` — o enum se sincroniza sozinho
6. `node agente/scripts/agente.mjs validar`

### Ligar uma ferramenta

1. Declare em `tools:` com **todos** os `status` que ela pode devolver
2. Cite no `<tools>` do ramo, dizendo o que fazer com **cada** status entre aspas
3. Acrescente o id na lista `tools:` daquele ramo

O validador reprova ferramenta com vários retornos e regra para só parte deles — é onde o
modelo inventa comportamento no status que ninguém previu.

### Publicar

```
node agente/scripts/agente.mjs gerar
```

Importe `agente/workflow.n8n.json` no n8n em Workflows → Import from File. Para subir o n8n
e apontar domínio, use as skills `coolify` e `cloudflare`.

## Regra de conclusão

**Nunca diga que terminou sem `validar` limpo.** Rode, cole a saída, e só então declare
pronto. Se reprovar, conserte — não contorne, não desative a checagem.

```
node agente/scripts/agente.mjs validar
```

## Erros que se repetem

| Sintoma | Causa quase sempre |
|---|---|
| o agente cai sempre no mesmo ramo | falta `<regra-de-ouro>`, ou ela não diz para ficar no funil |
| responde com JSON na conversa | falta a regra "resposta é sempre texto puro" |
| repete a mesma frase | falta a regra de anti-repetição no ramo |
| o fluxo importa e não roteia | o enum está fora de sincronia — rode `gerar` |
| quebra ao montar o texto | usou `{{ }}`; o motor de fluxo avalia como expressão |
| inventa preço | falta a proibição explícita no `<regras>` do ramo |

## Integrações

- **`n8n`** instalada → ela cuida de subir e testar o fluxo gerado
- **`coolify`** instalada → hospeda o n8n e a Evolution API
- **`cloudflare`** instalada → aponta o subdomínio do webhook
- **CRM** instalado → `gravar_lead` aponta para o `POST /api/leads` dele
