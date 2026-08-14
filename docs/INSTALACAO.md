# Instalação

## Requisitos

- **Node 18 ou superior** (`node -v`). Só isso — o CLI não tem dependência nenhuma.
- **Claude Code** instalado, para as skills e agentes serem carregados. O CRM roda
  sozinho, sem Claude Code.

## Rodando

```bash
cd ~/projetos/cliente-x
npx automarketing
```

O `npx` baixa e executa sem instalar nada permanentemente. Para instalar global:

```bash
npm install -g automarketing
automarketing
```

Enquanto o pacote não estiver publicado no npm, rode a partir do clone:

```bash
git clone https://github.com/mateuscaldasdev/automarketing.git
node automarketing/bin/automarketing.js --dir ~/projetos/cliente-x
```

---

## O que acontece no disco

Nada fora do diretório de destino. O CLI **copia arquivos**, não roda script de terceiro,
não altera nada global e não faz requisição de rede.

```
projeto-do-cliente/
├── .automarketing/
│   └── cliente.md          perfil gerado pelo onboarding
├── .claude/
│   ├── skills/
│   │   ├── criacao-de-blog/SKILL.md
│   │   ├── criacao-de-site/SKILL.md
│   │   ├── redes-sociais/SKILL.md
│   │   ├── n8n/SKILL.md
│   │   └── coolify/SKILL.md
│   └── agents/
│       ├── desenvolvedor-senior.md
│       └── engenheiro-arquitetura-software.md
└── crm/                    aplicação completa
```

Só é criado o que você escolheu no menu.

**Depois de instalar skills ou agentes, reinicie a sessão do Claude Code** — ele lê
`.claude/` na inicialização.

---

## Comandos

| Comando | O que faz |
|---|---|
| `npx automarketing` | Onboarding (primeira vez) + menu de escolha |
| `npx automarketing list` | Lista as ferramentas disponíveis com id e tipo |
| `npx automarketing add crm n8n` | Instala direto pelos ids, sem perguntar nada |
| `npx automarketing --all` | Instala tudo, sem perguntar nada |
| `npx automarketing --help` | Ajuda |

## Opções

| Opção | Efeito |
|---|---|
| `--dir <caminho>` | Projeto de destino. Padrão: diretório atual |
| `--force` | Sobrescreve o que já existe |
| `--onboarding` | Refaz as perguntas mesmo já tendo perfil |
| `--sem-onboarding` | Pula as perguntas e vai direto ao menu |

---

## Teclas do menu

| Tecla | Ação |
|---|---|
| ↑ / ↓ (ou `k` / `j`) | Mover |
| espaço | Marcar / desmarcar |
| `a` | Marcar ou desmarcar tudo |
| enter | Confirmar |
| Esc / Ctrl+C | Cancelar sem instalar nada |

---

## Reinstalar e atualizar

Por padrão o CLI **não sobrescreve** — o que já existe é reportado como ignorado:

```
  • CRM Open Source (estoque + WhatsApp + n8n) já existe (use --force para sobrescrever)
```

Isso protege as customizações que você fez nas skills do cliente. Para atualizar de fato:

```bash
npx automarketing add crm --force
```

⚠️ `--force` em uma skill que você editou **apaga suas alterações**. Em `crm/` ele
remove a pasta inteira antes de copiar — inclusive `data/db.json` e `.env`. Faça backup,
ou instale a versão nova em outro diretório e compare.

---

## Uso em terminal não interativo (CI, script)

O menu precisa de TTY. Em script, use as formas que não perguntam nada:

```bash
npx automarketing --all --dir ./projeto
npx automarketing add crm n8n --dir ./projeto
```

Sem TTY e sem esses flags, o CLI falha com uma mensagem explicando o que usar.

---

## Desinstalar

Apague o que foi copiado:

```bash
rm -rf .claude/skills/<nome> .claude/agents/<nome>.md crm .automarketing
```

Não há registro global nem processo em segundo plano.
