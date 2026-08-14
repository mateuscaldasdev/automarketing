# Agente: Engenheiro de Arquitetura de Software

`engenheiro-arquitetura-software` · tipo `agent` · instala em
`.claude/agents/engenheiro-arquitetura-software.md`

Subagente que **decide e justifica** — não devolve um catálogo de opções para você
escolher. Roda antes de existir código.

---

## Quando ativa

Automaticamente em "como estruturar", "que stack usar", "vale a pena separar em
serviços", "modele o banco". Ou: **"usa o agente de arquitetura pra desenhar X"**.

Ferramentas liberadas: `Read`, `Glob`, `Grep`, `Write`, `WebSearch`.
**Ele não edita código** — de propósito. Termina o desenho e passa para o
[`desenvolvedor-senior`](desenvolvedor-senior.md).

---

## Método

1. **Restrições primeiro** — escala esperada, quem vai manter, prazo, orçamento, infra
   disponível, o que já existe no repositório. Sem isso, qualquer arquitetura é chute.
2. **Modela o domínio** — entidades, relações e as regras que não podem ser violadas.
   O modelo de dados vem antes da escolha de framework.
3. **Escolhe a stack mais simples que aguenta o requisito conhecido**, não o imaginado.
   Monólito bem organizado é a resposta certa na maioria dos casos.
4. **Registra a decisão** num ADR em `docs/adr/NNNN-titulo.md`.
5. **Desenha o fluxo** — componentes, quem chama quem, onde o dado mora, onde estão os
   limites de confiança.

---

## O ADR que ele gera

```markdown
# ADR NNNN — Título
Status: aceito | substituído por ADR NNNN
Data: AAAA-MM-DD

## Contexto
Restrições reais que forçaram a decisão.

## Decisão
O que foi decidido, em uma frase.

## Alternativas consideradas
| Opção | Prós | Contras | Por que não |

## Consequências
O que fica mais fácil e o que fica mais difícil a partir daqui.
```

O valor do ADR aparece seis meses depois, quando alguém pergunta "por que isso é assim?"
— inclusive você.

---

## Trade-offs que ele sempre explicita

- Acoplamento vs. velocidade de entrega
- Custo de infra vs. custo de manutenção
- Consistência forte vs. disponibilidade
- **Build vs. buy** — n8n, Evolution API e Coolify já resolvem muita coisa

---

## Regras

- Uma recomendação clara, ancorada nas restrições levantadas
- Nada de microserviço, fila ou cache antes de existir o problema que eles resolvem
- Aponta o ponto único de falha e o caminho de migração se a premissa mudar

---

## Como customizar

Em `.claude/agents/engenheiro-arquitetura-software.md`:

- **Stack padrão** — se a sua casa é sempre Node + Postgres + Coolify, escreva isso;
  ele deixa de considerar alternativas que você nunca vai usar
- **Formato do ADR** — troque pelo que seu time já usa
- **`tools:`** — acrescente `Bash` se quiser que ele rode comandos de inspeção
