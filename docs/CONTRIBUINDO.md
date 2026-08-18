# Contribuindo

## Adicionar uma skill nova

Exemplo: uma skill de tráfego pago.

**1. Crie o template**

`templates/skills/trafego-pago/SKILL.md`:

```markdown
---
name: trafego-pago
description: Squad de Tráfego Pago da Automarketing. Use quando o usuário quiser criar
  ou otimizar campanhas — Meta Ads, Google Ads, públicos, criativos, orçamento ou
  análise de resultado. Também nos pedidos indiretos ("meu anúncio não converte").
---

# Squad: Tráfego Pago

> **Antes de perguntar qualquer coisa, leia `.automarketing/cliente.md`** — o onboarding
> do `npx github:mateuscaldasdev/automarketing` já registrou cliente, tipo de negócio, objetivo e público.
> Só pergunte o que faltar lá, e grave a resposta nova no arquivo.

...
```

A **`description` é o que faz a skill ativar sozinha**. Escreva os gatilhos reais,
inclusive como o cliente fala — é a parte mais importante do arquivo.

**2. Registre em `src/registry.js`**

```js
{
  id: 'trafego-pago',
  name: 'Tráfego Pago',
  kind: 'skill',
  group: 'Aquisição',
  description: 'Squad de mídia paga: campanhas, públicos e otimização.',
},
```

**3. (Opcional) Sugira por tipo de negócio**

Em `src/onboarding.js`, acrescente o id no `sugestao` dos tipos que fizerem sentido.

**4. Documente**

Crie `docs/squads/trafego-pago.md` seguindo o padrão dos outros: quando ativa, o que faz
etapa por etapa, o que entrega, integrações, como customizar.

**5. Teste**

```bash
node bin/automarketing.js add trafego-pago --dir /tmp/teste
```

Nenhum arquivo do CLI precisa mudar além do registry.

---

## Adicionar um agente

Igual à skill, mas o template é um arquivo único em `templates/agents/<id>.md`, com
frontmatter de agente:

```markdown
---
name: meu-agente
description: Quando usar este agente.
tools: Read, Write, Edit, Glob, Grep, Bash
model: inherit
---

Instruções do agente.
```

E `kind: 'agent'` no registry.

**Skill ou agente?** Skill orienta o trabalho dentro da sua conversa. Agente executa uma
tarefa fechada em contexto separado e devolve um relatório. Conteúdo e processo →
skill. Tarefa grande e delegável → agente.

---

## Adicionar um app

1. `templates/apps/<id>/` com a aplicação inteira.
2. Registro com `kind: 'app'` e `target: '<pasta-destino>'`.
3. README próprio dentro do app, com `.env.example` e como rodar.

Mantenha a regra de zero dependências sempre que der — é o que faz o `npm start`
funcionar na hora, na frente do cliente.

---

## Padrões de escrita das skills

O que faz uma skill boa neste repositório:

- **Português do Brasil, direto.** Quem lê e edita pode não ser dev.
- **Etapas numeradas**, em ordem, com o que entregar em cada uma.
- **Caminhos de arquivo explícitos** — `conteudo/blog/<slug>/post.md`, não "um arquivo
  de post".
- **Checklist verificável** no final. "Bom SEO" não é verificável; "`description` entre
  150 e 160 caracteres" é.
- **Integrações declaradas** — o que fazer se outra skill do pacote estiver instalada.
- **Sem código onde markdown resolve.**

---

## Antes de abrir PR

```bash
node --check bin/automarketing.js
for f in src/*.js; do node --check "$f"; done
node bin/automarketing.js --all --dir /tmp/regressao
node bin/automarketing.js list
```

Se mexeu no CRM:

```bash
cd /tmp/regressao/crm
npm install
npm run build
npm run dev
```

Nada de `&&` em comando que vai para a documentação: o PowerShell do Windows não aceita,
e é o shell da maioria dos clientes.

Se mexeu no fluxo interativo, teste com terminal de verdade — o menu depende de TTY.

---

## Versionamento

`major.minor.patch` em `package.json`, e o `CHANGELOG.md` atualizado no mesmo commit.

- **patch** — correção em template ou texto
- **minor** — ferramenta nova no registry, campo novo no onboarding
- **major** — mudança que quebra instalação existente (caminho de destino, formato do
  `cliente.md`)
