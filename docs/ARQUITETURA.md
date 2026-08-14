# Arquitetura do CLI

O CLI é deliberadamente pequeno: ele **copia arquivos**. Toda a inteligência do produto
está nos templates (as skills, os agentes, o CRM), não no código que os instala.

---

## Estrutura

```
automarketing/
├── bin/automarketing.js      entrada: parse de argumentos e orquestração
├── src/
│   ├── registry.js           catálogo — a única fonte de verdade
│   ├── install.js            resolve origem/destino e copia
│   ├── onboarding.js         perguntas + geração do cliente.md
│   └── ui.js                 prompts e cores, sem dependência
├── templates/                o que é copiado
│   ├── skills/<id>/SKILL.md
│   ├── agents/<id>.md
│   └── apps/<id>/
└── docs/
```

Zero dependências, no CLI e no CRM. Motivo: `npx` de pacote sem dependência é instantâneo,
não quebra por incompatibilidade de versão e não tem superfície de supply chain.

---

## Fluxo de uma execução

```
bin/automarketing.js
  │
  ├─ parse de argv → { cwd, force, posicionais }
  │
  ├─ --help / list ────────────────────────────────► imprime e sai
  │
  ├─ --all         → ids = todos do registry
  ├─ add <ids>     → ids = argumentos posicionais
  └─ (interativo)
        ├─ onboarding.perguntar()      se ainda não houver perfil
        │     └─ ui.select / ui.text
        ├─ ui.multiselect()            com as sugestões pré-marcadas
        └─ ids = o que ficou marcado
  │
  ├─ registry.findItem(id) para cada id  → erro se desconhecido
  ├─ install.installAll(items, cwd)
  ├─ onboarding.salvarPerfil()          se o onboarding rodou
  └─ resumo + exit code (1 se houve erro)
```

---

## `registry.js` — o catálogo

Um array de objetos. Cada entrada declara o que é e como se instala:

```js
{
  id: 'crm',                    // usado em `add <id>` e no nome da pasta
  name: 'CRM Open Source ...',  // rótulo no menu
  kind: 'app',                  // skill | agent | app
  target: 'crm',                // só para app: pasta de destino
  group: 'Produto',             // agrupamento no `list`
  description: '...',
}
```

O `kind` determina origem e destino, em `install.js`:

| kind | Origem | Destino |
|---|---|---|
| `skill` | `templates/skills/<id>/` | `<projeto>/.claude/skills/<id>/` |
| `agent` | `templates/agents/<id>.md` | `<projeto>/.claude/agents/<id>.md` |
| `app` | `templates/apps/<id>/` | `<projeto>/<target>/` |

**Adicionar uma ferramenta nova é criar o template e acrescentar uma linha aqui.**
Nenhum outro arquivo muda — o menu, o `list`, o `add` e o `--all` leem do registry.

---

## `install.js` — a cópia

`installItem()` devolve `{ status, dest, reason? }`, com três desfechos:

- `ok` — copiado
- `skipped` — destino já existe e não veio `--force` (protege customização do cliente)
- `error` — template ausente no pacote

Diretórios são copiados recursivamente com `fs.readdirSync(..., {withFileTypes:true})`.
Com `--force` em diretório, o destino é removido antes — é o que torna `--force`
destrutivo para `crm/`, que guarda `data/` e `.env`.

O exit code é `1` se qualquer item deu erro, `0` caso contrário. Serve para CI.

---

## `ui.js` — prompts sem dependência

Três primitivas, todas em `process.stdin` em raw mode:

- **`multiselect(titulo, opcoes, {unico})`** — setas, espaço, `a`, enter. Redesenha
  subindo o cursor com `[<n>A` e limpando cada linha com `[2K`.
- **`select()`** — o mesmo em modo `unico`, onde a marcação segue o cursor.
- **`text(pergunta, padrao)`** — lê caractere a caractere, trata backspace, enter aceita
  o padrão.

Todas abortam com Ctrl+C (exit 130). Sem TTY, `multiselect` rejeita com uma mensagem
dizendo qual flag usar.

Por que não `inquirer` ou `@clack/prompts`: são bons, mas custariam a promessa de zero
dependências por ~200 linhas que não mudam nunca.

---

## `onboarding.js`

Duas responsabilidades:

- **`perguntar(cwd)`** → `{ perfil, sugeridos }`. As sugestões saem da tabela `NEGOCIOS`,
  onde cada tipo de negócio lista os ids que costumam fazer sentido.
- **`salvarPerfil()`** → escreve `.automarketing/cliente.md`.
- **`lerPerfil()`** → lê de volta os campos com regex sobre as linhas `- **Campo:** valor`.

O formato do perfil é markdown legível de propósito: quem lê é tanto o CLI quanto o
Claude Code quanto o humano.

---

## Decisões e seus porquês

| Decisão | Por quê |
|---|---|
| Zero dependências | `npx` instantâneo, sem quebra por versão, sem supply chain |
| Copiar em vez de linkar | O cliente é dono dos arquivos e pode customizar |
| Não sobrescrever por padrão | Customização do cliente não se perde numa reinstalação |
| Skills em markdown, sem código | Quem edita é a pessoa de marketing, não o dev |
| Registry como fonte única | Ferramenta nova = template + uma linha |
| Perfil em markdown | Serve para o CLI, para o Claude Code e para o humano |
| CRM sem dependências | Roda em qualquer máquina com Node, sem `npm install` |

---

## Testando durante o desenvolvimento

```bash
node bin/automarketing.js --dir /tmp/teste           # fluxo completo
node bin/automarketing.js --all --dir /tmp/teste     # sem interação
node --check bin/automarketing.js                    # sintaxe
```

Para testar o fluxo interativo sem terminal (CI), dá para simular o TTY substituindo
`process.stdin` por um `EventEmitter` com `isTTY: true` e emitindo as teclas — foi assim
que o onboarding foi verificado.
