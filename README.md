<div align="center">

# Automarketing CLI

**Instale squads de IA e um CRM open source em qualquer projeto, com um comando.**

```bash
npx automarketing
```

Skills e agentes prontos para Claude Code + um CRM completo com funil, estoque,
WhatsApp e n8n. Zero dependências, Node 18+.

</div>

---

## O que é isto

Um instalador. Você roda `npx automarketing` dentro do projeto de um cliente, responde
cinco perguntas, escolhe as ferramentas no menu e elas aparecem no disco — prontas para
usar, suas para editar.

```
  ▰▰▰ AUTOMARKETING  cli
      squads prontos para o seu projeto

  1. Este projeto é para quem?
   ❯ ● Para um cliente meu
     ○ Para mim / meu próprio negócio

  2. Nome do cliente: (happy-baloes) Happy Balões
  3. Que tipo de negócio é?  → Venda de produto / e-commerce
  4. Quem é o cliente dele, em uma frase: mães organizando festa infantil

  Já marcamos o que costuma fazer sentido nesse tipo de negócio — ajuste à vontade.

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

  ✔ Redes Sociais → .claude\skills\redes-sociais
  ✔ n8n → .claude\skills\n8n
  ✔ CRM Open Source → crm
  ✔ Perfil do cliente → .automarketing\cliente.md
```

---

## As ferramentas

Cada uma tem uma página própria explicando quando ativa, o que faz etapa por etapa, o
que entrega e como customizar.

### Skills — orientam o trabalho dentro da sua conversa com o Claude Code

| Ferramenta | O que faz | Documentação |
|---|---|---|
| **Criação de Blog** | Estrategista → Redator → Revisor SEO. Entrega outline aprovado e post com frontmatter | [docs](docs/squads/criacao-de-blog.md) |
| **Criação de Site** | Briefing → Copywriter → Front-end. Entrega uma landing rodando, com o form ligado ao CRM | [docs](docs/squads/criacao-de-site.md) |
| **Redes Sociais** | Linha editorial → Calendário → Roteiros, carrosséis e legendas prontos para publicar | [docs](docs/squads/redes-sociais.md) |
| **n8n** | Gera JSON de workflow importável, com webhooks, integrações e nada de segredo no arquivo | [docs](docs/squads/n8n.md) |
| **Coolify** | Deploy self-hosted: Dockerfile, variáveis, domínio, SSL e tabela de diagnóstico | [docs](docs/squads/coolify.md) |

### Agentes — executam tarefas fechadas em contexto separado

| Ferramenta | O que faz | Documentação |
|---|---|---|
| **Desenvolvedor Sênior** | Implementa, verifica de verdade e relata honestamente o que rodou | [docs](docs/squads/desenvolvedor-senior.md) |
| **Engenheiro de Arquitetura** | Decide stack e desenha o sistema, registra ADR. Não escreve código | [docs](docs/squads/engenheiro-arquitetura-software.md) |

### App — software que roda na máquina do cliente

| Ferramenta | O que faz | Documentação |
|---|---|---|
| **CRM Open Source** | Funil kanban, controle de estoque, WhatsApp (Evolution API) e eventos para o n8n | [docs](docs/squads/crm.md) |

---

## O CRM em 30 segundos

```bash
npx automarketing add crm
cd crm && cp .env.example .env && npm start
# http://localhost:3333
```

Sobe já com dados de exemplo. Sem `npm install`, sem banco para configurar.

- **Funil** de 5 etapas com arrastar e soltar; cada mudança dispara evento no n8n
- **Estoque** com entradas, saídas, histórico, bloqueio de saldo negativo e alerta de mínimo
- **WhatsApp** pela Evolution API — e mensagem recebida de número novo **vira lead sozinha**
- **n8n** recebe `lead.criado`, `lead.etapa_alterada`, `estoque.abaixo_do_minimo` e
  `whatsapp.mensagem_recebida`
- **Deploy** com Dockerfile, docker-compose e `/health` prontos para a Coolify

API completa, modelo de dados e limites conhecidos: [docs/squads/crm.md](docs/squads/crm.md).

---

## Documentação

| Página | Para quê |
|---|---|
| [Instalação](docs/INSTALACAO.md) | Requisitos, comandos, o que vai para o disco, como atualizar e desinstalar |
| [Onboarding](docs/ONBOARDING.md) | As cinco perguntas, o `cliente.md` gerado e como as skills o usam |
| [Arquitetura](docs/ARQUITETURA.md) | Como o CLI funciona por dentro e por que as decisões foram essas |
| [Contribuindo](docs/CONTRIBUINDO.md) | Como adicionar uma ferramenta nova ao catálogo |

---

## Onde as coisas ficam

```
projeto-do-cliente/
├── .automarketing/cliente.md    perfil do cliente, lido por todas as skills
├── .claude/
│   ├── skills/<nome>/SKILL.md   carregadas pelo Claude Code
│   └── agents/<nome>.md
└── crm/                         a aplicação
```

Depois de instalar skills ou agentes, **reinicie a sessão do Claude Code**.

---

## Comandos

```bash
npx automarketing                      # onboarding + menu
npx automarketing list                 # lista as ferramentas
npx automarketing add crm n8n          # instala direto pelos ids
npx automarketing --all                # instala tudo
npx automarketing --help
```

| Opção | Efeito |
|---|---|
| `--dir <caminho>` | Projeto de destino (padrão: diretório atual) |
| `--force` | Sobrescreve o que já existe |
| `--onboarding` | Refaz as perguntas |
| `--sem-onboarding` | Pula as perguntas |

Sem `--force`, o que já existe é preservado — sua customização não se perde numa
reinstalação.

---

## Filosofia

- **Os squads já vêm prontos.** Ninguém precisa montar time de agente antes de trabalhar.
- **O cliente é dono dos arquivos.** Tudo é copiado, em markdown, editável.
- **Zero dependências.** `npx` instantâneo, nada quebra por versão de biblioteca.
- **O onboarding pergunta uma vez.** O perfil fica em `cliente.md` e todas as skills leem.
- **Nada de mágica.** O CLI copia arquivos. A inteligência está nos templates, que você lê.

---

## Licença

MIT — veja [LICENSE](LICENSE).
