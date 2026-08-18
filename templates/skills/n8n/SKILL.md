---
name: n8n
description: Squad de Automação n8n da Automarketing. Use quando o usuário quiser criar, corrigir ou entender um workflow n8n — webhook, integração entre sistemas, disparo de WhatsApp, automação de CRM, agendamento ou processamento de leads. Também quando ele mencionar "automatizar", "integrar X com Y" ou colar um JSON de workflow.
---

# Squad: Automação n8n

> **Antes de perguntar qualquer coisa, leia `.automarketing/cliente.md`** — o onboarding
> do `npx github:mateuscaldasdev/automarketing` já registrou cliente, tipo de negócio, objetivo e público.
> Só pergunte o que faltar lá, e grave a resposta nova no arquivo.

Você entrega **JSON de workflow importável**, não instruções de clicar na interface.

## Fluxo de trabalho

1. **Mapeie o gatilho**: o que inicia? (webhook, cron, evento de app, manual)
2. **Mapeie os passos**: entrada → transformação → decisão → ação → resposta.
3. **Liste as credenciais necessárias** e avise o usuário antes de gerar.
4. **Gere o JSON** em `n8n/<nome-do-workflow>.json`.
5. **Documente** em `n8n/<nome-do-workflow>.md`: o que faz, como importar, variáveis a trocar.

## Estrutura mínima de um workflow válido

```json
{
  "name": "nome-do-workflow",
  "nodes": [
    {
      "parameters": { "httpMethod": "POST", "path": "meu-webhook", "responseMode": "responseNode" },
      "id": "webhook-1",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [0, 0]
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "Proximo", "type": "main", "index": 0 }]] }
  },
  "settings": { "executionOrder": "v1" },
  "active": false
}
```

Regras do JSON:
- Todo node precisa de `id`, `name`, `type`, `typeVersion`, `position` e `parameters`.
- `connections` referencia nodes pelo **nome**, não pelo id.
- `position` em grade de 220px no eixo X — workflow ilegível é workflow que ninguém mantém.
- Nunca coloque segredo no JSON. Use `{{ $env.MINHA_VAR }}` ou credencial nomeada.

## Nodes mais usados nos projetos da Automarketing

| Necessidade | Node |
|---|---|
| Receber evento externo | `n8n-nodes-base.webhook` |
| Responder o webhook | `n8n-nodes-base.respondToWebhook` |
| Chamar API (Evolution, CRM) | `n8n-nodes-base.httpRequest` |
| Transformar dados | `n8n-nodes-base.code` (JS) |
| Decidir caminho | `n8n-nodes-base.if` / `.switch` |
| Agendar | `n8n-nodes-base.scheduleTrigger` |
| Banco | `n8n-nodes-base.postgres` |

## Padrão WhatsApp (Evolution API)

```
Webhook (mensagem recebida)
  → Code (normaliza telefone e texto)
  → IF (é lead novo?)
      sim → HTTP Request POST {{CRM_URL}}/api/leads
      não → HTTP Request POST {{CRM_URL}}/api/leads/:id/mensagens
  → HTTP Request POST {{EVOLUTION_URL}}/message/sendText/{{INSTANCIA}}
  → Respond to Webhook (200)
```

## Checklist antes de entregar

- [ ] JSON valida (`node -e "JSON.parse(require('fs').readFileSync('arquivo.json'))"`)
- [ ] Nenhuma credencial hardcoded
- [ ] Node de erro ou `continueOnFail` nos passos que chamam serviço externo
- [ ] README com as variáveis que o cliente precisa trocar
- [ ] `active: false` — quem ativa é o cliente, depois de testar
