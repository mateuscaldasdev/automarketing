import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { aplicarMigracoes } from './migracoes.js';

const PASTA = join(process.cwd(), 'supabase', 'migracoes');

/**
 * Em que pé está a instalação, olhando só o ambiente.
 *
 *   demo         nada configurado — o CRM abre com dados no navegador
 *   sem-conexao  Supabase configurado, mas sem DATABASE_URL: não dá para criar
 *                tabela, porque PostgREST não executa DDL
 *   pronto       dá para migrar
 */
export function estadoDaInstalacao(env) {
  const temSupabase = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!temSupabase) return 'demo';
  if (!env.DATABASE_URL) return 'sem-conexao';
  return 'pronto';
}

/**
 * O pooler de transação do Supabase (6543) não sustenta advisory lock nem toda
 * DDL. A migração precisa da conexão direta ou do pooler de sessão.
 */
export function avisoDePooler(url) {
  if (!url) return '';
  return /:6543\b/.test(url)
    ? 'DATABASE_URL está na porta 6543 (pooler de transação). A migração precisa da conexão direta ou do pooler de sessão — troque para a porta 5432.'
    : '';
}

export function conexao() {
  return new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

/** Verdadeiro enquanto não existir nenhum super admin. */
export async function precisaDeDono(cliente) {
  const { rows } = await cliente.query(
    "select count(*)::int as total from public.perfis where papel = 'super_admin'",
  );
  return rows[0].total === 0;
}

/** Devolve a lista de problemas. Vazia significa válido. */
export function validarDono({ email, senha, organizacao } = {}) {
  const problemas = [];
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ''))) {
    problemas.push('Informe um e-mail válido.');
  }
  if (String(senha || '').length < 8) {
    problemas.push('A senha precisa de pelo menos 8 caracteres.');
  }
  if (!String(organizacao || '').trim()) {
    problemas.push('Informe o nome da organização.');
  }
  return problemas;
}

/** Guardado no módulo para a aplicação mostrar o erro em vez de não subir. */
export const situacao = { estado: 'demo', erro: '', aviso: '' };

export async function instalar() {
  situacao.estado = estadoDaInstalacao(process.env);
  situacao.aviso = avisoDePooler(process.env.DATABASE_URL);
  if (situacao.estado !== 'pronto') return situacao;

  const cliente = conexao();
  try {
    await cliente.connect();
    const arquivos = readdirSync(PASTA);
    const { aplicadas } = await aplicarMigracoes(cliente, {
      arquivos,
      ler: (nome) => readFileSync(join(PASTA, nome), 'utf8'),
    });
    if (aplicadas.length) console.log(`[crm] migrações aplicadas: ${aplicadas.join(', ')}`);
  } catch (erro) {
    // A aplicação sobe assim mesmo: um CRM que não abre é pior que um que abre
    // avisando o que houve.
    situacao.estado = 'erro';
    situacao.erro = erro.message;
    console.error('[crm] falha ao instalar o banco:', erro.message);
  } finally {
    await cliente.end().catch(() => {});
  }
  return situacao;
}
