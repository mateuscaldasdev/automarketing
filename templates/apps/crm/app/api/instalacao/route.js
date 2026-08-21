import { createClient } from '@supabase/supabase-js';
import {
  avisoDePooler, conexao, estadoDaInstalacao, precisaDeDono, situacao, validarDono,
} from '../../../lib/servidor/instalacao';

export const runtime = 'nodejs';

async function comBanco(fn) {
  const cliente = conexao();
  await cliente.connect();
  try { return await fn(cliente); } finally { await cliente.end().catch(() => {}); }
}

/**
 * O estado é recalculado do ambiente a cada chamada, de propósito.
 *
 * O Next empacota `instrumentation.js` separado dos manipuladores de rota, então
 * a variável de módulo que o boot preenche pode não ser a mesma instância que
 * esta rota enxerga. Confiar nela faria a tela dizer "tudo pronto" com o banco
 * configurado — e o usuário nunca conseguiria criar a própria conta.
 *
 * Só a mensagem de erro da migração vem do módulo: ela não tem como ser
 * recalculada aqui. Se não chegar, o pior caso é a tela não detalhar a falha.
 */
function situacaoAtual() {
  return {
    estado: estadoDaInstalacao(process.env),
    aviso: avisoDePooler(process.env.DATABASE_URL),
    erro: situacao.erro || '',
  };
}

export async function GET() {
  const agora = situacaoAtual();
  if (agora.estado !== 'pronto') {
    return Response.json({ ...agora, precisaDeDono: false });
  }
  try {
    const falta = await comBanco(precisaDeDono);
    return Response.json({ ...agora, precisaDeDono: falta });
  } catch (erro) {
    // Tabela ainda não existe ou conexão recusada: é falha de instalação, não
    // "tudo pronto". Dizer que está pronto aqui esconderia o problema.
    return Response.json({ ...agora, estado: 'erro', erro: erro.message, precisaDeDono: false });
  }
}

export async function POST(req) {
  if (situacaoAtual().estado !== 'pronto') {
    return Response.json({ erro: 'Banco não configurado.' }, { status: 400 });
  }

  const corpo = await req.json().catch(() => ({}));
  const problemas = validarDono(corpo);
  if (problemas.length) return Response.json({ problemas }, { status: 400 });

  // A porta só existe enquanto não há dono. Depois disso, fecha para sempre —
  // senão qualquer um criaria o super admin do sistema.
  const aberta = await comBanco(precisaDeDono);
  if (!aberta) return Response.json({ erro: 'O sistema já tem um administrador.' }, { status: 409 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await admin.auth.admin.createUser({
    email: corpo.email,
    password: corpo.senha,
    email_confirm: true,
    user_metadata: { nome: corpo.nome || corpo.email },
  });
  if (error) return Response.json({ erro: error.message }, { status: 400 });

  await comBanco(async (cliente) => {
    const { rows } = await cliente.query(
      'insert into public.organizacoes (nome) values ($1) returning id',
      [String(corpo.organizacao).trim()],
    );
    await cliente.query(
      "update public.perfis set papel = 'super_admin', organizacao_id = $1, nome = $2 where id = $3",
      [rows[0].id, corpo.nome || corpo.email, data.user.id],
    );
  });

  return Response.json({ ok: true });
}
