# Squad: Automação n8n

`n8n` · tipo `skill` · instala em `.claude/skills/n8n/SKILL.md`

Entrega **JSON de workflow importável** — não instruções de onde clicar na interface.
Você importa o arquivo no n8n, troca as variáveis e ativa.

---

## Quando ativa sozinho

- "automatiza o envio de WhatsApp quando entrar lead"
- "integra o CRM com a planilha"
- "esse workflow tá dando erro, olha aqui" (colando o JSON)
- "preciso que rode todo dia às 8h"

Para forçar: **"use a skill n8n"**.

---

## O que ele faz

1. **Mapeia o gatilho** — webhook, cron, evento de app ou manual.
2. **Mapeia os passos** — entrada → transformação → decisão → ação → resposta.
3. **Lista as credenciais necessárias e avisa antes de gerar** — você descobre o que vai
   precisar antes de o trabalho estar pronto pela metade.
4. **Gera o JSON** em `n8n/<nome>.json`.
5. **Documenta** em `n8n/<nome>.md`: o que faz, como importar, o que trocar.

---

## Regras do JSON que ele respeita

- Todo node com `id`, `name`, `type`, `typeVersion`, `position` e `parameters`
- `connections` referencia nodes **pelo nome**, não pelo id
- `position` em grade de 220px no eixo X — workflow ilegível é workflow que ninguém mantém
- **Nenhum segredo no JSON**: sempre `{{ $env.MINHA_VAR }}` ou credencial nomeada
- `active: false` — quem ativa é o cliente, depois de testar

Checklist antes de entregar: JSON valida, nada hardcoded, tratamento de erro nos passos
que chamam serviço externo, README com as variáveis.

---

## Tabela de nodes que ele usa

| Necessidade | Node |
|---|---|
| Receber evento externo | `n8n-nodes-base.webhook` |
| Responder o webhook | `n8n-nodes-base.respondToWebhook` |
| Chamar API (Evolution, CRM) | `n8n-nodes-base.httpRequest` |
| Transformar dados | `n8n-nodes-base.code` |
| Decidir caminho | `n8n-nodes-base.if` / `.switch` |
| Agendar | `n8n-nodes-base.scheduleTrigger` |
| Banco | `n8n-nodes-base.postgres` |

---

## Padrão WhatsApp já documentado na skill

```
Webhook (mensagem recebida)
  → Code (normaliza telefone e texto)
  → IF (é lead novo?)
      sim → POST {{CRM_URL}}/api/leads
      não → POST {{CRM_URL}}/api/leads/:id/mensagens
  → POST {{EVOLUTION_URL}}/message/sendText/{{INSTANCIA}}
  → Respond to Webhook (200)
```

---

## Integração com o CRM

Se o [`crm`](crm.md) estiver instalado, ele já dispara quatro eventos para o n8n:
`lead.criado`, `lead.etapa_alterada`, `estoque.abaixo_do_minimo` e
`whatsapp.mensagem_recebida`. O workflow de exemplo que consome tudo isso vem junto,
em `crm/n8n/crm-automarketing.json`.

Fluxo típico de um cliente: mensagem no WhatsApp → CRM cria o lead → evento no n8n →
n8n manda a resposta automática e avisa o vendedor.

---

## Como customizar

Em `.claude/skills/n8n/SKILL.md`:

- **Nodes preferidos** — a tabela acima
- **Convenção de nomes e pastas** — `n8n/<nome>.json`
- **Padrões recorrentes** — acrescente os fluxos que você repete em cliente após cliente;
  é o que mais acelera o trabalho
- **Versão do n8n** — se o cliente usa uma versão antiga, ajuste os `typeVersion`
