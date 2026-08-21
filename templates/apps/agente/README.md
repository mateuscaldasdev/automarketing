# Modelo de Agente Conversacional

Um **padrão** de agente de atendimento, não um template solto: a estrutura da conversa é
fixa e verificável por máquina; nicho, tom, etapas e ferramentas são livres.

O que veio instalado é um agente de **atendimento e venda** completo e funcionando. Adapte
para o seu cliente — a skill `agente` e o agente `adaptador-de-agente` ajudam nisso.

## Comece por aqui

```
node scripts/agente.mjs validar
node scripts/agente.mjs gerar
```

O `gerar` escreve `workflow.n8n.json`. Importe no n8n em **Workflows → Import from File**.

Um comando por linha: o PowerShell do Windows não aceita `&&`.

## Como está organizado

```
agente.yml              o manifesto — a fonte da verdade
prompts/
  classificador.md      decide em qual etapa o cliente está
  etapa-*.md            um por etapa do funil
  desvio-*.md           um por exceção
scripts/agente.mjs      validar · gerar · semear · exportar
workflow.n8n.json       gerado pelo `gerar` — não edite à mão
```

## Como funciona

```
mensagem → CLASSIFICADOR → devolve UM token do enum
         → NORMALIZADOR   → o que não reconhecer vai para o destino seguro
         → ROTEADOR       → cada token tem sua saída
         → RAMO           → o prompt especialista daquela etapa
```

O classificador **só classifica**. Ele não conversa, não explica, não escreve frase — devolve
um token e pronto. Quem conversa é o ramo.

## As oito regras do padrão

1. **Um classificador, e só um.** Devolve um token. Sem prosa.
2. **Enum fechado, em dois tipos:** `etapas` (o funil, ordenado) e `desvios` (exceções).
3. **Regra de ouro declarada:** com funil ativo, permanece no funil.
4. **Destino seguro:** o que não for reconhecido cai num ramo declarado. Degrada, não quebra.
5. **Um prompt por ramo, sempre com o mesmo esqueleto:** `<ordem>`, `<tools>`, `<regras>`,
   `<interacao>`.
6. **Exemplo é obrigatório.** Todo token precisa de exemplo; toda Situação precisa do texto
   literal de resposta.
7. **Placeholder é `[[ ]]`.** Nunca `{{ }}` — o motor de fluxo avalia e quebra.
8. **Arquivo é o default, banco é o override.** O texto daqui vai para o git; o CRM edita
   por cima.

## Os quatro comandos

| Comando | O que faz |
|---|---|
| `validar` | confere o padrão. Reprova antes de qualquer geração |
| `gerar` | sincroniza o enum do classificador e escreve o fluxo do n8n |
| `semear` | empacota tudo em `semente.json` para o CRM carregar |
| `exportar` | traz de volta para os arquivos o que foi editado no CRM |

O `exportar` não é conveniência: sem ele, a versão boa do prompt fica presa no banco de um
cliente só, fora do git.

## O que o validador reprova

- token do classificador que não bate com as etapas e desvios declarados
- destino seguro ausente ou apontando para token inexistente
- prompt sem um dos blocos obrigatórios do seu tipo
- etapa no manifesto sem arquivo de prompt — e prompt que nenhum ramo usa
- `<tools>` citando ferramenta que não existe no manifesto
- ferramenta com vários status e conduta para apenas parte deles
- `<interacao>` sem Situação, ou Situação sem texto literal
- token sem nenhum exemplo
- `{{ }}` dentro de prompt

Nada é gerado com validação reprovada.

## Por que o enum é gerado

O mesmo token precisa existir em três lugares: manifesto, classificador e roteador. Três
lugares para desalinhar — e é assim que esse tipo de agente cai em produção.

Por isso o bloco entre os marcadores no `classificador.md` **não é escrito à mão**: o `gerar`
o reescreve a partir do manifesto. Deriva deixa de ser possível, em vez de ser proibida por
documentação.

## O YAML aceito

Um subconjunto deliberado, para não arrastar biblioteca para o seu projeto: mapa, lista de
mapas, lista embutida (`[a, b]`) e comentário de linha inteira. Sem âncora, sem bloco
literal, sem mapa aninhado dentro de item de lista. O manifesto que veio instalado usa
exatamente esse subconjunto — siga o formato dele e não tem erro.

## Limites conhecidos

- `semear` e `exportar` trabalham com `semente.json`. A carga direta nas tabelas do CRM
  chega junto com as telas de configuração do agente.
- O fluxo gerado traz a espinha: entrada, classificação, roteamento e os ramos. As
  ferramentas você liga no n8n, com as credenciais do cliente — elas não entram no arquivo
  de propósito, para não versionar segredo.
- Um só canal por agente. Dois canais, dois agentes.
