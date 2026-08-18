/**
 * Endpoint de captura: é por aqui que o n8n, o site e o agente de WhatsApp
 * jogam lead no CRM.
 *
 *   POST /api/leads
 *   x-api-key: <CRM_API_KEY>
 *   { "nome": "...", "telefone": "...", "origem": "WhatsApp" }
 *
 * Escreve com a service_role (ignora RLS), então a chave protege a rota.
 */

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = process.env.CRM_API_KEY;

function json(corpo, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function POST(request) {
  if (!URL || !SERVICE_ROLE) {
    return json({
      erro: 'Supabase não configurado',
      detalhe: 'Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. '
        + 'No modo demonstração os dados ficam no navegador e não há como gravar pela API.',
    }, 501);
  }

  if (!API_KEY) {
    return json({ erro: 'CRM_API_KEY não definida — a rota está desabilitada por segurança' }, 501);
  }
  if (request.headers.get('x-api-key') !== API_KEY) {
    return json({ erro: 'chave inválida' }, 401);
  }

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: 'JSON inválido' }, 400);
  }

  const nome = String(corpo.nome || '').trim();
  if (!nome) return json({ erro: 'nome é obrigatório' }, 400);

  const lead = {
    nome,
    telefone: String(corpo.telefone || '').replace(/\D/g, ''),
    email: String(corpo.email || '').trim(),
    origem: corpo.origem || 'Manual',
    etapa: 'novo',
    valor: Number(corpo.valor) || 0,
    score: Number(corpo.score) || 0,
    cargo: String(corpo.cargo || ''),
    organizacao_id: corpo.organizacao_id || process.env.CRM_ORGANIZACAO_PADRAO || null,
  };

  const supabase = createClient(URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data, error } = await supabase.from('leads').insert(lead).select().single();

  if (error) return json({ erro: error.message }, 400);
  return json({ ok: true, lead: data }, 201);
}

export async function GET() {
  return json({
    rota: 'POST /api/leads',
    autenticacao: 'header x-api-key',
    campos: ['nome (obrigatório)', 'telefone', 'email', 'origem', 'valor', 'score', 'cargo'],
  });
}
