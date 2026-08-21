'use client';

/**
 * Camada de dados da equipe: fala com o Supabase quando configurado, e cai no
 * modo demonstração (memória do navegador) quando não está.
 *
 * Vive em módulo próprio, com chave de localStorage própria, para não misturar
 * pessoas e convites com o estado dos leads — são assuntos diferentes, e cada
 * um pode ser reiniciado sem levar o outro junto.
 */

import { temSupabase, supabase } from './dados';

const CHAVE_EQUIPE = 'crm-automarketing-equipe';

const SEMENTE_EQUIPE = [
  { id: 'u1', nome: 'Você', email: 'demo@automarketing.local', papel: 'super_admin' },
  { id: 'u2', nome: 'Marina Alves', email: 'marina@exemplo.com', papel: 'admin' },
  { id: 'u3', nome: 'Rafael Lima', email: 'rafael@exemplo.com', papel: 'usuario' },
];

function semente() {
  return { equipe: structuredClone(SEMENTE_EQUIPE), convites: [] };
}

/** No servidor não há localStorage: devolve a semente e nada é gravado. */
function lerDemoEquipe() {
  if (typeof window === 'undefined') return semente();
  try {
    const salvo = window.localStorage.getItem(CHAVE_EQUIPE);
    if (salvo) {
      const estado = JSON.parse(salvo);
      if (!estado.equipe) estado.equipe = structuredClone(SEMENTE_EQUIPE);
      if (!estado.convites) estado.convites = [];
      return estado;
    }
  } catch { /* localStorage bloqueado ou conteúdo estragado: segue com a semente */ }
  return semente();
}

function gravarDemoEquipe(estado) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(CHAVE_EQUIPE, JSON.stringify(estado)); } catch { /* ignora */ }
}

export function reiniciarDemoEquipe() {
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(CHAVE_EQUIPE); } catch { /* ignora */ }
  }
}

/* --------------------------------- equipe -------------------------------- */

export async function listarEquipe() {
  if (!temSupabase) {
    const estado = lerDemoEquipe();
    gravarDemoEquipe(estado);
    return estado.equipe;
  }
  const { data, error } = await supabase().from('perfis').select('id, nome, papel').order('nome');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function trocarPapel(perfilId, papel) {
  if (!temSupabase) {
    const estado = lerDemoEquipe();
    const pessoa = estado.equipe.find((p) => String(p.id) === String(perfilId));
    if (pessoa) pessoa.papel = papel;
    gravarDemoEquipe(estado);
    return pessoa;
  }
  const { error } = await supabase().from('perfis').update({ papel }).eq('id', perfilId);
  if (error) throw new Error(error.message);
}

export async function convidar(email, papel) {
  const limpo = String(email || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpo)) throw new Error('Informe um e-mail válido.');

  if (!temSupabase) {
    const estado = lerDemoEquipe();
    estado.convites = [...estado.convites, { email: limpo, papel, criado_em: new Date().toISOString() }];
    gravarDemoEquipe(estado);
    return;
  }
  const { error } = await supabase().from('convites').insert({ email: limpo, papel });
  if (error) throw new Error(error.message);
}

export async function listarConvites() {
  if (!temSupabase) return lerDemoEquipe().convites;
  const { data, error } = await supabase()
    .from('convites').select('*').is('aceito_em', null).order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
