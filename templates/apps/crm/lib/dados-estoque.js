'use client';

/**
 * Camada de dados do estoque: fala com o Supabase quando configurado, e cai no
 * modo demonstração (memória do navegador) quando não está.
 *
 * Fica separado de `lib/dados.js` de propósito: estoque é um assunto fechado em
 * si, com semente e chave de armazenamento próprias. De lá vêm só a conexão
 * (`supabase`) e a decisão de qual modo usar (`temSupabase`).
 */

import { temSupabase, supabase } from './dados';
import { saldoApos } from './estoque';

/* --------------------------- modo demonstração --------------------------- */

const CHAVE_DEMO = 'crm-automarketing-estoque';

const SEMENTE_PRODUTOS = [
  { id: 'p1', nome: 'Camiseta branca P', sku: 'CAM-BR-P', unidade: 'un', saldo: 12, minimo: 5, ativo: true },
  { id: 'p2', nome: 'Camiseta branca M', sku: 'CAM-BR-M', unidade: 'un', saldo: 3, minimo: 5, ativo: true },
  { id: 'p3', nome: 'Caixa de papelão', sku: 'CX-30', unidade: 'un', saldo: 40, minimo: 0, ativo: true },
];

function estadoInicial() {
  return { produtos: structuredClone(SEMENTE_PRODUTOS) };
}

/**
 * Lê o estoque de demonstração do navegador.
 *
 * No servidor não existe `window`, então devolve a semente — o componente monta
 * e o primeiro efeito no cliente traz o que está salvo de verdade. Um
 * `localStorage` bloqueado ou com JSON estragado também cai na semente, em vez
 * de derrubar a tela.
 */
function lerProdutos() {
  if (typeof window === 'undefined') return estadoInicial();
  try {
    const salvo = window.localStorage.getItem(CHAVE_DEMO);
    if (salvo) {
      const estado = JSON.parse(salvo);
      if (estado && Array.isArray(estado.produtos)) return estado;
    }
  } catch { /* localStorage bloqueado: segue com a semente */ }
  return estadoInicial();
}

function gravarProdutos(estado) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(CHAVE_DEMO, JSON.stringify(estado)); } catch { /* ignora */ }
}

/* -------------------------------- estoque -------------------------------- */

export async function listarProdutos() {
  if (!temSupabase) return lerProdutos().produtos;

  const { data, error } = await supabase()
    .from('produtos').select('*').order('nome');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function criarProduto(dados) {
  const produto = {
    nome: String(dados.nome || '').trim(),
    sku: String(dados.sku || '').trim(),
    unidade: String(dados.unidade || 'un').trim() || 'un',
    minimo: Number(dados.minimo) || 0,
  };
  if (!produto.nome) throw new Error('Informe o nome do produto.');

  if (!temSupabase) {
    const estado = lerProdutos();
    const novo = { ...produto, id: `p${Date.now()}`, saldo: 0, ativo: true };
    estado.produtos.push(novo);
    gravarProdutos(estado);
    return novo;
  }

  const { data, error } = await supabase().from('produtos').insert(produto).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function lancarMovimentacao(produtoId, { tipo, quantidade, motivo }) {
  if (!temSupabase) {
    const estado = lerProdutos();
    const produto = estado.produtos.find((p) => String(p.id) === String(produtoId));
    if (!produto) throw new Error('Produto não encontrado.');
    produto.saldo = saldoApos(produto.saldo, { tipo, quantidade });  // valida e calcula
    gravarProdutos(estado);
    return produto;
  }

  // Com Supabase o saldo é atualizado pelo trigger; aqui só validamos antes de gravar.
  saldoApos(0, { tipo, quantidade });
  const { error } = await supabase().from('movimentacoes_estoque')
    .insert({ produto_id: produtoId, tipo, quantidade: Number(quantidade), motivo: motivo || '' });
  if (error) throw new Error(error.message);
}
