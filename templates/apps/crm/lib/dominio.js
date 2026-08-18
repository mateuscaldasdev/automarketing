/** Regras de domínio do CRM — valem no modo demo e com Supabase. */

export const ETAPAS = [
  { id: 'novo', nome: 'Novos leads', cor: 'var(--roxo-claro)' },
  { id: 'contato', nome: 'Em contato', cor: 'var(--azul)' },
  { id: 'qualificado', nome: 'Qualificado', cor: 'var(--ciano)' },
  { id: 'reuniao', nome: 'Reunião agendada', cor: 'var(--amarelo)' },
  { id: 'proposta', nome: 'Proposta enviada', cor: 'var(--laranja)' },
  { id: 'ganho', nome: 'Fechado / Ganho', cor: 'var(--verde)' },
  { id: 'perdido', nome: 'Perdido', cor: 'var(--texto-3)' },
];

export const ORIGENS = ['Meta', 'Google', 'Orgânico', 'WhatsApp', 'Indicação', 'Manual'];

/** Papéis, do mais para o menos poderoso. */
export const PAPEIS = {
  super_admin: {
    nome: 'Super admin',
    descricao: 'O desenvolvedor. Enxerga e administra todas as organizações.',
    nivel: 3,
  },
  admin: {
    nome: 'Admin',
    descricao: 'O cliente. Administra a própria organização e seus funcionários.',
    nivel: 2,
  },
  usuario: {
    nome: 'Usuário',
    descricao: 'Funcionário. Trabalha os leads da organização, sem mexer em configuração.',
    nivel: 1,
  },
};

export function podeGerenciarEquipe(papel) {
  return (PAPEIS[papel]?.nivel || 0) >= 2;
}

export function podeVerTodasOrganizacoes(papel) {
  return papel === 'super_admin';
}

export function faixaDoScore(score) {
  if (score >= 70) return { classe: 'alto', rotulo: 'Score Alto' };
  if (score >= 40) return { classe: 'medio', rotulo: 'Score Médio' };
  return { classe: 'baixo', rotulo: 'Score Baixo' };
}

export function iniciais(nome = '') {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase() || '?';
}

export const brl = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function telefoneBonito(t = '') {
  const d = String(t).replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return t;
}
