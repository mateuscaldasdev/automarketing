'use client';

/**
 * Camada de dados: fala com o Supabase quando configurado, e cai no modo demo
 * (memória do navegador) quando não está.
 *
 * O modo demo existe para o CRM abrir e ser navegável sem nenhuma configuração —
 * útil para apresentar. Nada é gravado em servidor nenhum.
 */

import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const temSupabase = Boolean(URL && CHAVE);

let cliente = null;
export function supabase() {
  if (!temSupabase) return null;
  if (!cliente) cliente = createBrowserClient(URL, CHAVE);
  return cliente;
}

/* ------------------------------- modo demo ------------------------------ */

const CHAVE_DEMO = 'crm-automarketing-demo';

const SEMENTE = {
  leads: [
    { id: 1, nome: 'Mateus Andrade', telefone: '5521990287370', email: '', origem: 'WhatsApp', etapa: 'novo', valor: 0, score: 25, cargo: '', criado_em: '2026-08-14T12:00:00Z' },
    { id: 2, nome: 'Mateus Caldas', telefone: '5521990287370', email: 'mateus@exemplo.com', origem: 'WhatsApp', etapa: 'ganho', valor: 4800, score: 88, cargo: 'Trabalhista', criado_em: '2026-08-10T12:00:00Z' },
    { id: 3, nome: 'Ana Prado', telefone: '5511966665555', email: 'ana@exemplo.com', origem: 'Indicação', etapa: 'proposta', valor: 2400, score: 72, cargo: 'Diretora', criado_em: '2026-08-12T12:00:00Z' },
    { id: 4, nome: 'Carlos Menezes', telefone: '5511955554444', email: '', origem: 'Meta', etapa: 'contato', valor: 900, score: 51, cargo: '', criado_em: '2026-08-13T12:00:00Z' },
    { id: 5, nome: 'Juliana Reis', telefone: '5511944443333', email: 'ju@exemplo.com', origem: 'Google', etapa: 'qualificado', valor: 1500, score: 64, cargo: 'Compras', criado_em: '2026-08-13T15:00:00Z' },
    { id: 6, nome: 'Pedro Salles', telefone: '5511933332222', email: '', origem: 'Orgânico', etapa: 'reuniao', valor: 3200, score: 78, cargo: '', criado_em: '2026-08-14T09:00:00Z' },
  ],
  proximoId: 7,
};

function lerDemo() {
  if (typeof window === 'undefined') return structuredClone(SEMENTE);
  try {
    const salvo = window.localStorage.getItem(CHAVE_DEMO);
    if (salvo) return JSON.parse(salvo);
  } catch { /* localStorage bloqueado: segue com a semente */ }
  return structuredClone(SEMENTE);
}

function gravarDemo(estado) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(CHAVE_DEMO, JSON.stringify(estado)); } catch { /* ignora */ }
}

export function reiniciarDemo() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(CHAVE_DEMO);
}

/* --------------------------------- leads -------------------------------- */

export async function listarLeads() {
  if (!temSupabase) return lerDemo().leads;

  const { data, error } = await supabase()
    .from('leads')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function criarLead(dados) {
  const lead = {
    nome: String(dados.nome || '').trim(),
    telefone: String(dados.telefone || '').replace(/\D/g, ''),
    email: String(dados.email || '').trim(),
    origem: dados.origem || 'Manual',
    etapa: dados.etapa || 'novo',
    valor: Number(dados.valor) || 0,
    score: Number(dados.score) || 0,
    cargo: String(dados.cargo || ''),
  };
  if (!lead.nome) throw new Error('Informe o nome do lead.');

  if (!temSupabase) {
    const estado = lerDemo();
    const novo = { ...lead, id: estado.proximoId++, criado_em: new Date().toISOString() };
    estado.leads.unshift(novo);
    gravarDemo(estado);
    return novo;
  }

  const { data, error } = await supabase().from('leads').insert(lead).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function moverLead(id, etapa) {
  if (!temSupabase) {
    const estado = lerDemo();
    const lead = estado.leads.find((l) => String(l.id) === String(id));
    if (lead) lead.etapa = etapa;
    gravarDemo(estado);
    return lead;
  }

  const { data, error } = await supabase()
    .from('leads')
    .update({ etapa, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function removerLead(id) {
  if (!temSupabase) {
    const estado = lerDemo();
    estado.leads = estado.leads.filter((l) => String(l.id) !== String(id));
    gravarDemo(estado);
    return;
  }
  const { error } = await supabase().from('leads').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* --------------------------------- sessão ------------------------------- */

/** No modo demo, entra como super admin para tudo ficar visível. */
export async function sessaoAtual() {
  if (!temSupabase) {
    return {
      demo: true,
      email: 'demo@automarketing.local',
      nome: 'Modo demonstração',
      papel: 'super_admin',
      organizacao: 'Automarketing (demo)',
    };
  }

  const { data: { user } } = await supabase().auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase()
    .from('perfis')
    .select('nome, papel, organizacoes(nome)')
    .eq('id', user.id)
    .single();

  return {
    demo: false,
    email: user.email,
    nome: perfil?.nome || user.email,
    papel: perfil?.papel || 'usuario',
    organizacao: perfil?.organizacoes?.nome || '—',
  };
}

export async function sair() {
  if (temSupabase) await supabase().auth.signOut();
}
