/**
 * Catálogo de squads da Automarketing.
 *
 * Cada squad já vem pronto — o cliente só escolhe o que instalar.
 *
 * kind:
 *   'skill'  -> copiado para .claude/skills/<id>/
 *   'agent'  -> copiado para .claude/agents/<id>.md
 *   'app'    -> copiado para ./<target>/ (aplicação rodável)
 */

export const REGISTRY = [
  {
    id: 'criacao-de-blog',
    name: 'Criação de Blog',
    kind: 'skill',
    group: 'Conteúdo',
    description: 'Squad de blog: pauta, SEO, redação e publicação.',
  },
  {
    id: 'criacao-de-site',
    name: 'Criação de Site',
    kind: 'skill',
    group: 'Conteúdo',
    description: 'Squad de site: landing page, copy, estrutura e deploy.',
  },
  {
    id: 'redes-sociais',
    name: 'Redes Sociais',
    kind: 'skill',
    group: 'Conteúdo',
    description: 'Squad social: calendário, roteiros, carrosséis e legendas.',
  },
  {
    id: 'n8n',
    name: 'n8n',
    kind: 'skill',
    group: 'Automação',
    description: 'Squad de automação: workflows n8n, webhooks e integrações.',
  },
  {
    id: 'coolify',
    name: 'Coolify',
    kind: 'skill',
    group: 'Infra',
    description: 'Squad de infra: deploy self-hosted na Coolify, domínios e SSL.',
  },
  {
    id: 'desenvolvedor-senior',
    name: 'Desenvolvedor Sênior',
    kind: 'agent',
    group: 'Engenharia',
    description: 'Agente que implementa features com testes e commits atômicos.',
  },
  {
    id: 'engenheiro-arquitetura-software',
    name: 'Engenheiro de Arquitetura de Software',
    kind: 'agent',
    group: 'Engenharia',
    description: 'Agente que desenha arquitetura, ADRs e decide trade-offs.',
  },
  {
    id: 'crm',
    name: 'CRM Open Source (estoque + WhatsApp + n8n)',
    kind: 'app',
    target: 'crm',
    group: 'Produto',
    description: 'CRM rodável: leads em kanban, controle de estoque, WhatsApp (Evolution API) e webhooks n8n.',
  },
];

export function findItem(id) {
  return REGISTRY.find((item) => item.id === id);
}
