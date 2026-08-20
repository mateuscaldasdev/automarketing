# Modelo de Agente — design

**Data:** 2026-08-20
**Estado:** aprovado, aguardando plano de implementação
**Escopo:** o modelo de prompt e fluxo instalável. Não cobre o CRM nem o método de trabalho interno.

---

## 1. O problema

Hoje a Automarketing entrega squads de conteúdo, infra e um CRM. O que ela **não** entrega
é a peça mais valiosa: o agente de atendimento que conversa com o cliente final.

Esse agente já existe e roda em produção, mas vive como um projeto artesanal — prompts em
arquivos soltos, workflow gerado por scripts de uso único, conhecimento na cabeça de quem
montou. Não dá para instalar em outro cliente sem refazer, e não dá para outra agência usar.

Este projeto transforma esse conhecimento em **um padrão instalável**.

## 2. O que é, em uma frase

> Um padrão de agente conversacional: a estrutura da conversa é fixa e verificável por
> máquina; nicho, tom, etapas e ferramentas são livres.

Não é um template de agente. É um **padrão**, com um validador que reprova quem sair dele
e preenchimentos prontos para ninguém começar da folha em branco.

## 3. Decisões

| Decisão | Por quê |
|---|---|
| A definição é neutra de motor | O agente precisa rodar no n8n **ou** dentro do CRM. Se o modelo fosse o JSON do n8n, seria preciso escrever o agente duas vezes. |
| O JSON do n8n é saída, não fonte | Fluxo gerado por código já é a prática que funciona. Aqui vira formato, não disciplina. |
| Arquivo é o default, banco é o override | O prompt vai para o git e é o que a IA adapta. O CRM edita por cima. Em runtime, o banco mescla sobre o arquivo — se o banco cair, o agente continua de pé. |
| O enum é gerado, não digitado | Token desalinhado entre classificador e roteador é a falha nº 1 desse tipo de sistema. Gerar torna a deriva impossível, em vez de proibida por documentação. |
| Um item de catálogo, três destinos | Modelo, skill e agente são inúteis separados. Obrigar a marcar três linhas no menu é convite a instalar pela metade. |

### Alternativas descartadas

**Só markdown, sem manifesto.** Cada etapa como `.md` com frontmatter, enum derivado da
lista de arquivos. Mais simples de ler, mas roteamento, exceções e destino seguro não cabem
em frontmatter — e são justamente a parte com inteligência. Ou se perde a validação, ou se
reinventa o manifesto aos pedaços.

**Tudo no banco, arquivo só como semente.** "Configurável no CRM" sairia de graça, mas a
skill e o agente que adaptam teriam de conversar com um banco em vez de editar arquivos —
muito pior para IA — e o versionamento em git desapareceria, que é o que faz uma agência
confiar no pacote.

## 4. O padrão: as oito regras invariáveis

1. **Um classificador, e só um.** Função única: ler histórico e mensagem, devolver **um
   token**. Sem prosa, sem explicação, sem parênteses.
2. **Enum fechado, em dois tipos.** Etapas de **funil** (o caminho normal, ordenado) e
   **desvios** (exceções). A distinção é estrutural: muda como o classificador decide.
3. **Regra de ouro declarada.** O comportamento anti-deriva: com funil ativo, permanece no
   funil, mesmo diante de pergunta solta. Sem isso o agente escorrega para o ramo genérico.
4. **Normalizador com destino seguro.** A saída é normalizada contra o enum; o que não for
   reconhecido cai num destino declarado. O agente degrada, nunca quebra.
5. **Um prompt por ramo, sempre com o mesmo esqueleto** — `<ordem>`, `<tools>`, `<regras>`,
   `<interacao>`.
6. **Exemplo é obrigatório.** O classificador precisa de exemplos `entrada → token`
   cobrindo todos os tokens; cada Situação precisa do texto literal de saída.
7. **Placeholder com marcador próprio.** Contexto dinâmico usa `[[ ]]`. Nunca `{{ }}` — o
   motor de fluxo avalia como expressão e quebra.
8. **Prompt = default em arquivo + override em banco**, mesclados em runtime.

### O que é livre

Identidade e tom · quantidade e nome das etapas · as tools · o canal · todo o texto.

**A estrutura é lei; o conteúdo é do usuário.** A skill e o agente recusam quebra de forma,
nunca opinam sobre o negócio.

## 5. O validador

Os blocos obrigatórios diferem por tipo de arquivo, e o validador cobra cada um no seu:

| Arquivo | Blocos obrigatórios |
|---|---|
| `classificador.md` | `<identidade>`, `<principio>`, `<funil>`, `<regra-de-ouro>`, `<regras>`, bloco de tokens gerado, `### Exemplos` |
| ramo (`etapa-*.md`, `desvio-*.md`) | `<ordem>`, `<tools>`, `<regras>`, `<interacao>` |

`<desvios>` é obrigatório no classificador **apenas quando** o manifesto declara ao menos um
desvio. Um agente sem desvios é válido.

`validar` reprova:

- token do classificador que não bate **exatamente** com as etapas e desvios declarados
- destino seguro ausente, ou apontando para token inexistente
- arquivo sem um dos blocos obrigatórios do seu tipo, conforme a tabela acima
- etapa ou desvio no manifesto sem arquivo de prompt — e o inverso
- `<tools>` citando ferramenta que não existe no manifesto
- ferramenta com vários status de retorno e regra para apenas parte deles
- `<interacao>` sem Situação, ou Situação sem texto literal
- token sem nenhum exemplo no classificador
- `{{ }}` dentro de arquivo de prompt

Nenhuma geração acontece com validação reprovada.

## 6. Anatomia no disco

```
projeto-do-cliente/
├── agente/
│   ├── agente.yml              manifesto
│   ├── prompts/
│   │   ├── classificador.md
│   │   ├── etapa-<id>.md       um por etapa do funil
│   │   └── desvio-<id>.md      um por desvio
│   └── README.md
└── .claude/
    ├── skills/agente/SKILL.md          ensina a adaptar respeitando o padrão
    └── agents/adaptador-de-agente.md   faz a adaptação de ponta a ponta
```

### Mudança no CLI

O registry hoje conhece `skill`, `agent` e `app` — um destino cada. É preciso um `kind`
novo com múltiplos destinos:

```js
{
  id: 'agente',
  name: 'Modelo de Agente Conversacional',
  kind: 'bundle',
  group: 'Automação',
  partes: [
    { kind: 'app',   origem: 'apps/agente',                    target: 'agente' },
    { kind: 'skill', origem: 'skills/agente' },
    { kind: 'agent', origem: 'agents/adaptador-de-agente.md' },
  ],
  description: 'Padrão de agente conversacional: manifesto, prompts, validador e gerador.',
}
```

## 7. O manifesto

```yaml
agente:
  nome: Aurora
  papel: atendimento e venda
  canal: whatsapp              # whatsapp | instagram | site

classificador:
  prompt: prompts/classificador.md
  destino_seguro: duvidas      # regra 4 — para onde vai o não reconhecido

etapas:                        # o funil, na ordem
  - id: recepcao
    token: "Etapa 1"
    prompt: prompts/etapa-recepcao.md
    tools: [gravar_lead]

desvios:                       # as exceções
  - id: negociacao
    token: negociacao
    prompt: prompts/desvio-negociacao.md
    tools: []

tools:
  - id: gravar_lead
    descricao: "Grava o lead no CRM e devolve o id."
    status: [ok, duplicado, erro]   # o validador cobra regra para CADA um
    tipo: http                      # http | sql | interno
    config: { metodo: POST, caminho: /api/leads, env: CRM_URL }
```

`tipo` diz como a ferramenta é executada: `http` chama um endpoint, `sql` roda uma consulta
no banco do CRM, `interno` é implementado pelo próprio motor (gravar memória, encerrar
atendimento) e não tem `config`.

## 8. Os esqueletos de prompt

### Classificador

```markdown
<identidade>
- Nome: {nome}
- Função: classificar em qual etapa do atendimento o cliente está.
</identidade>

<principio>
O atendimento segue um funil em ordem. Identifique pelo HISTÓRICO onde o cliente está.
Os desvios são EXCEÇÃO: use apenas quando ele CLARAMENTE sair do funil.
</principio>

<funil>
- "Etapa 1": o sinal no histórico que identifica esta etapa.
</funil>

<regra-de-ouro>
Com funil ativo, PERMANEÇA na etapa do funil — mesmo diante de pergunta de produto.
</regra-de-ouro>

<desvios>
- "negociacao": quando usar.
</desvios>

<regras>
- Retorne SOMENTE o token, com a grafia exata. Sem explicação, sem frase completa.
</regras>

## Tokens
<!-- gerado a partir de agente.yml — não editar à mão -->
`Etapa 1` · `negociacao` · `duvidas`
<!-- fim -->

### Exemplos
- "acabei de preencher o formulário" → `Etapa 1`
- "tem desconto?" → `negociacao`
```

### Ramo (etapa ou desvio)

```markdown
<ordem>
1. Acione a(s) ferramenta(s) de <tools> conforme o contexto.
2. Leia e compreenda <regras>.
3. Realize SOMENTE a interação de <interacao>.
</ordem>

<tools>
- tool 'gravar_lead': o que faz e quando acionar. Devolve "ok" (siga), "duplicado"
  (não recrie, siga) ou "erro" (avise que vai confirmar com a equipe).
</tools>

<regras>
- Sua resposta é SEMPRE texto puro. NUNCA escreva JSON ou nome de campo na conversa.
- JAMAIS repita frase que já mandou no histórico. Varie sempre.
- NUNCA repergunte o que já está no histórico.
</regras>

<interacao>
[Situação 1 — o cliente acabou de chegar]
"texto literal da resposta"

[Situação 2 — ...]
"texto literal da resposta"
</interacao>
```

## 9. Os quatro comandos

| Comando | O que faz |
|---|---|
| `validar` | verifica o padrão; reprova antes de qualquer geração |
| `gerar` | cospe o workflow do n8n, pronto para importar |
| `semear` | escreve os defaults nas tabelas do CRM |
| `exportar` | traz de volta para arquivo o que foi editado no CRM |

`exportar` não é conveniência: sem ele, a versão boa do prompt fica presa no banco de um
cliente só, fora do git.

## 10. A skill e o agente

| | **Agente** `adaptador-de-agente` | **Skill** `agente` |
|---|---|---|
| Quando | uma vez, na partida a frio | todo dia, dali em diante |
| O que faz | produz o agente inteiro | conduz ajuste, conserto e crescimento |
| Como roda | contexto separado, devolve relatório | dentro da conversa |
| Entrega | manifesto + todos os prompts, validados | uma mudança de cada vez |

O agente lê `.automarketing/cliente.md` — nicho, público e tom já estão lá do onboarding —
e **não declara conclusão sem validação limpa**. O relatório fecha com a saída do `validar`.

### A entrevista da skill

| Pergunta | Vira |
|---|---|
| Qual o caminho normal, do "oi" até o fechamento? | as **etapas** do funil, em ordem |
| Onde o cliente costuma sair desse caminho? | os **desvios** |
| O que o agente precisa consultar ou gravar? | as **tools** e seus status |
| Como esse negócio fala? | a **identidade** e o tom |
| O que ele **nunca** pode dizer? | as **regras** de proibição |

A última é a mais subestimada e ninguém a oferece espontaneamente. É dela que sai o tipo de
trava que salva venda — por exemplo, nunca dizer preço no chat e remeter à proposta.

### As três camadas que seguram o padrão

1. **Instrução** — a skill descreve os blocos e recusa prompt incompleto. Pega o caso comum.
2. **Geração** — o enum é regerado do manifesto. Aqui não existe "esquecer".
3. **Validação** — `validar` roda antes de qualquer "pronto". Pega o que passou pelas duas.

Documentação sozinha não segura estrutura com terceiros mexendo. A camada 2 faz o trabalho
pesado.

## 11. Fronteiras

### Com o n8n

Este projeto **gera** o workflow. Não sobe, não cria credencial, não faz deploy — isso é das
skills `n8n` e `coolify`, que já existem.

Contrato: `gerar` produz um JSON importável, com webhook → classificador → normalizador →
roteador → ramo, com LLM e memória compartilhados entre ramos.

### Com o CRM

| Este projeto | O projeto do CRM |
|---|---|
| **declara** o contrato: quais tabelas, quais colunas | **implementa** as telas de configurar, editar e observar |
| **semeia** os defaults | **guarda** os overrides com histórico |
| **entrega** a definição legível por máquina | **interpreta** a definição para executar a conversa |

**O motor de "rodar dentro do CRM" pertence ao projeto do CRM.** A obrigação aqui é entregar
uma definição rica o bastante para ser executada. Trazer o interpretador para cá faria este
projeto não terminar nunca e bloquearia o CRM.

## 12. Fora de escopo

- Deploy, credencial e infraestrutura → skills `n8n` e `coolify`
- Telas de configuração, edição e observabilidade → projeto do CRM
- O interpretador que roda a conversa dentro do CRM → projeto do CRM
- Conexão do WhatsApp → infraestrutura, com o conector existente
- Teste A/B de prompt e avaliação automática de qualidade

## 13. Critério de sucesso

> Um dev de outra agência instala o pacote, roda o agente adaptador com o perfil do cliente
> dele, importa o JSON no n8n e tem um agente respondendo — **sem trocar uma mensagem com a
> Automarketing.**

Se ele precisar perguntar qualquer coisa, o padrão não está óbvio o suficiente.

## 14. Riscos conhecidos

**O gerador de n8n é a peça mais frágil.** O formato tem armadilhas que só aparecem em
produção: roteador com fallback nomeado exige `options.fallbackOutput` mais o rename — o
nome direto é descartado na importação; `PUT` de workflow rejeita campo extra em `settings`;
ativar por API não registra o webhook. Essas cicatrizes já estão documentadas no agente em
produção e entram aqui como caso de teste, não como comentário.

**"Vários nichos" pode virar catálogo sem fim.** A v1 entrega **dois** preenchimentos —
atendimento e venda, agendamento de serviço. Cobrem as duas formas de funil que aparecem na
prática. Mais nichos depois são baratos porque a estrutura não muda.

**A entrevista depende de o usuário saber o próprio funil.** Muitos não sabem. Os dois
preenchimentos prontos existem justamente para dar um ponto de partida a quem trava.
