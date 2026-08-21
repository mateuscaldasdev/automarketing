/**
 * Decide quais migrações ainda faltam aplicar.
 *
 * Só entra arquivo no formato NNN_nome.sql — três dígitos. Isso impede que um
 * rascunho largado na pasta seja executado no banco de um cliente por acidente.
 * O zero à esquerda é o que faz a ordem alfabética coincidir com a numérica.
 */
export function pendentes(arquivos, aplicadas) {
  const jaFoi = new Set(aplicadas);
  return arquivos
    .filter((nome) => /^\d{3}_.+\.sql$/.test(nome))
    .filter((nome) => !jaFoi.has(nome))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

/** Número arbitrário e fixo: só precisa ser o mesmo em todas as instâncias. */
const TRAVA = 917_244_001;

const CRIAR_CONTROLE = `
  create table if not exists public.schema_versao (
    nome        text primary key,
    aplicada_em timestamptz not null default now()
  )
`;

/**
 * Aplica as migrações pendentes, uma transação por arquivo.
 *
 * O advisory lock existe porque em deploy com mais de uma réplica as instâncias
 * sobem juntas e tentariam migrar ao mesmo tempo. Ele é solto no finally — se
 * ficasse preso numa falha, todo deploy seguinte travaria esperando.
 */
export async function aplicarMigracoes(cliente, { arquivos, ler }) {
  await cliente.query(CRIAR_CONTROLE);
  await cliente.query(`select pg_advisory_lock(${TRAVA})`);

  const aplicadas = [];
  try {
    const { rows } = await cliente.query('select nome from public.schema_versao');
    const faltando = pendentes(arquivos, rows.map((r) => r.nome));

    for (const nome of faltando) {
      await cliente.query('begin');
      try {
        await cliente.query(ler(nome));
        await cliente.query('insert into public.schema_versao (nome) values ($1)', [nome]);
        await cliente.query('commit');
        aplicadas.push(nome);
      } catch (erro) {
        await cliente.query('rollback');
        throw new Error(`Migração ${nome} falhou: ${erro.message}`);
      }
    }
  } finally {
    await cliente.query(`select pg_advisory_unlock(${TRAVA})`);
  }

  return { aplicadas };
}
