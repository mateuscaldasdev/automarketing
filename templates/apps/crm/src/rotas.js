/** Rotas da API do CRM. */
import { load, save, nextId } from './db.js';
import { notificarN8n, enviarWhatsapp, parseMensagemEvolution } from './integracoes.js';

export const ETAPAS = ['novo', 'contato', 'proposta', 'ganho', 'perdido'];

const agora = () => new Date().toISOString();
const naoEncontrado = () => ({ status: 404, body: { erro: 'não encontrado' } });
const invalido = (msg) => ({ status: 400, body: { erro: msg } });

/* ---------------------------------- leads --------------------------------- */

async function criarLead(body) {
  if (!body.nome || !String(body.nome).trim()) return invalido('nome é obrigatório');
  const db = load();
  const lead = {
    id: nextId('lead'),
    nome: String(body.nome).trim(),
    telefone: String(body.telefone || '').replace(/\D/g, ''),
    email: String(body.email || '').trim(),
    origem: body.origem || 'manual',
    etapa: ETAPAS.includes(body.etapa) ? body.etapa : 'novo',
    valor: Number(body.valor) || 0,
    obs: String(body.obs || ''),
    criadoEm: agora(),
    atualizadoEm: agora(),
  };
  db.leads.push(lead);
  save();
  await notificarN8n('lead.criado', lead);
  return { status: 201, body: lead };
}

async function atualizarLead(id, body) {
  const db = load();
  const lead = db.leads.find((l) => l.id === id);
  if (!lead) return naoEncontrado();
  if (body.etapa && !ETAPAS.includes(body.etapa)) return invalido(`etapa inválida: ${body.etapa}`);

  const etapaAnterior = lead.etapa;
  for (const campo of ['nome', 'telefone', 'email', 'origem', 'etapa', 'obs']) {
    if (body[campo] !== undefined) lead[campo] = String(body[campo]);
  }
  if (body.valor !== undefined) lead.valor = Number(body.valor) || 0;
  lead.telefone = lead.telefone.replace(/\D/g, '');
  lead.atualizadoEm = agora();
  save();

  if (body.etapa && body.etapa !== etapaAnterior) {
    await notificarN8n('lead.etapa_alterada', { lead, etapaAnterior });
  }
  return { status: 200, body: lead };
}

function removerLead(id) {
  const db = load();
  const i = db.leads.findIndex((l) => l.id === id);
  if (i < 0) return naoEncontrado();
  const [lead] = db.leads.splice(i, 1);
  save();
  return { status: 200, body: lead };
}

/* -------------------------------- produtos -------------------------------- */

function criarProduto(body) {
  if (!body.nome) return invalido('nome é obrigatório');
  const db = load();
  const produto = {
    id: nextId('produto'),
    sku: String(body.sku || `SKU-${Date.now()}`),
    nome: String(body.nome).trim(),
    preco: Number(body.preco) || 0,
    estoque: Number(body.estoque) || 0,
    estoqueMinimo: Number(body.estoqueMinimo) || 0,
    criadoEm: agora(),
  };
  db.produtos.push(produto);
  save();
  return { status: 201, body: produto };
}

async function movimentarEstoque(id, body) {
  const db = load();
  const produto = db.produtos.find((p) => p.id === id);
  if (!produto) return naoEncontrado();

  const qtd = Number(body.quantidade);
  if (!Number.isFinite(qtd) || qtd === 0) return invalido('quantidade deve ser um número diferente de zero');
  const tipo = body.tipo === 'saida' ? 'saida' : 'entrada';
  const delta = tipo === 'saida' ? -Math.abs(qtd) : Math.abs(qtd);

  if (produto.estoque + delta < 0) {
    return invalido(`estoque insuficiente: disponível ${produto.estoque}, saída ${Math.abs(delta)}`);
  }

  produto.estoque += delta;
  const mov = {
    id: nextId('movimentacao'),
    produtoId: produto.id,
    sku: produto.sku,
    tipo,
    quantidade: Math.abs(qtd),
    saldo: produto.estoque,
    motivo: String(body.motivo || ''),
    em: agora(),
  };
  db.movimentacoes.unshift(mov);
  save();

  if (produto.estoque <= produto.estoqueMinimo) {
    await notificarN8n('estoque.abaixo_do_minimo', produto);
  }
  return { status: 200, body: { produto, movimentacao: mov } };
}

function removerProduto(id) {
  const db = load();
  const i = db.produtos.findIndex((p) => p.id === id);
  if (i < 0) return naoEncontrado();
  const [produto] = db.produtos.splice(i, 1);
  save();
  return { status: 200, body: produto };
}

/* -------------------------------- whatsapp -------------------------------- */

async function enviarMensagem(body) {
  if (!body.telefone || !body.texto) return invalido('telefone e texto são obrigatórios');
  const db = load();
  const resultado = await enviarWhatsapp(body.telefone, body.texto);
  const msg = {
    id: nextId('mensagem'),
    direcao: 'saida',
    telefone: String(body.telefone).replace(/\D/g, ''),
    texto: String(body.texto),
    entregue: resultado.enviado,
    detalhe: resultado.motivo || `status ${resultado.status ?? '-'}`,
    em: agora(),
  };
  db.mensagens.unshift(msg);
  save();
  return { status: resultado.enviado ? 200 : 502, body: { mensagem: msg, integracao: resultado } };
}

/** Webhook chamado pela Evolution API a cada mensagem recebida. */
async function receberMensagem(body) {
  const { telefone, texto, nome, deMim } = parseMensagemEvolution(body);
  if (!telefone) return invalido('payload sem telefone identificável');
  if (deMim) return { status: 200, body: { ignorado: 'mensagem enviada por mim' } };

  const db = load();
  const msg = {
    id: nextId('mensagem'),
    direcao: 'entrada',
    telefone,
    texto,
    entregue: true,
    detalhe: 'recebida',
    em: agora(),
  };
  db.mensagens.unshift(msg);

  let lead = db.leads.find((l) => l.telefone === telefone);
  let leadCriado = false;
  if (!lead) {
    lead = {
      id: nextId('lead'),
      nome: nome || `WhatsApp ${telefone.slice(-4)}`,
      telefone,
      email: '',
      origem: 'whatsapp',
      etapa: 'novo',
      valor: 0,
      obs: texto,
      criadoEm: agora(),
      atualizadoEm: agora(),
    };
    db.leads.push(lead);
    leadCriado = true;
  }
  save();

  await notificarN8n(leadCriado ? 'lead.criado' : 'whatsapp.mensagem_recebida', { lead, mensagem: msg });
  return { status: 200, body: { lead, mensagem: msg, leadCriado } };
}

/* --------------------------------- métricas -------------------------------- */

function metricas() {
  const db = load();
  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e, db.leads.filter((l) => l.etapa === e).length]));
  const ganhos = db.leads.filter((l) => l.etapa === 'ganho');
  return {
    status: 200,
    body: {
      leads: db.leads.length,
      porEtapa,
      receitaGanha: ganhos.reduce((s, l) => s + (l.valor || 0), 0),
      pipeline: db.leads
        .filter((l) => !['ganho', 'perdido'].includes(l.etapa))
        .reduce((s, l) => s + (l.valor || 0), 0),
      produtos: db.produtos.length,
      estoqueBaixo: db.produtos.filter((p) => p.estoque <= p.estoqueMinimo).length,
      mensagens: db.mensagens.length,
      integracoes: {
        n8n: Boolean(process.env.N8N_WEBHOOK_URL),
        whatsapp: Boolean(process.env.EVOLUTION_URL && process.env.EVOLUTION_INSTANCE),
      },
    },
  };
}

/* --------------------------------- router --------------------------------- */

/** Retorna { status, body } ou null se nenhuma rota casar. */
export async function rotear(metodo, caminho, body) {
  const db = load();

  if (metodo === 'GET' && caminho === '/health') return { status: 200, body: { status: 'ok' } };
  if (metodo === 'GET' && caminho === '/api/metricas') return metricas();

  if (metodo === 'GET' && caminho === '/api/leads') return { status: 200, body: db.leads };
  if (metodo === 'POST' && caminho === '/api/leads') return criarLead(body);

  let m = caminho.match(/^\/api\/leads\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    if (metodo === 'PATCH' || metodo === 'PUT') return atualizarLead(id, body);
    if (metodo === 'DELETE') return removerLead(id);
    if (metodo === 'GET') {
      const lead = db.leads.find((l) => l.id === id);
      return lead ? { status: 200, body: lead } : naoEncontrado();
    }
  }

  if (metodo === 'GET' && caminho === '/api/produtos') return { status: 200, body: db.produtos };
  if (metodo === 'POST' && caminho === '/api/produtos') return criarProduto(body);

  m = caminho.match(/^\/api\/produtos\/(\d+)$/);
  if (m && metodo === 'DELETE') return removerProduto(Number(m[1]));

  m = caminho.match(/^\/api\/produtos\/(\d+)\/movimentar$/);
  if (m && metodo === 'POST') return movimentarEstoque(Number(m[1]), body);

  if (metodo === 'GET' && caminho === '/api/movimentacoes') return { status: 200, body: db.movimentacoes.slice(0, 50) };
  if (metodo === 'GET' && caminho === '/api/mensagens') return { status: 200, body: db.mensagens.slice(0, 50) };
  if (metodo === 'POST' && caminho === '/api/whatsapp/enviar') return enviarMensagem(body);
  if (metodo === 'POST' && caminho === '/webhook/whatsapp') return receberMensagem(body);

  return null;
}
