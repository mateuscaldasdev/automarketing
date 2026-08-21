/** Regras de estoque. Valem no modo demonstração e com Supabase. */

export const TIPOS_MOVIMENTACAO = ['entrada', 'saida', 'ajuste'];

/**
 * Saldo depois de um lançamento.
 *
 * `ajuste` define o valor absoluto: é a correção de contagem física, e por isso
 * aceita zero. Saída pode deixar negativo de propósito — lançamento retroativo
 * acontece, e recusar só ensinaria o usuário a inventar uma entrada falsa.
 */
export function saldoApos(saldoAtual, { tipo, quantidade } = {}) {
  const atual = Number(saldoAtual) || 0;
  const q = Number(quantidade);

  if (!TIPOS_MOVIMENTACAO.includes(tipo)) {
    throw new Error(`Tipo de movimentação inválido: ${tipo}`);
  }
  if (!Number.isFinite(q)) throw new Error('Quantidade precisa ser um número.');

  if (tipo === 'ajuste') {
    if (q < 0) throw new Error('Ajuste não pode ser negativo.');
    return q;
  }
  if (q <= 0) throw new Error('A quantidade precisa ser maior que zero.');
  return tipo === 'entrada' ? atual + q : atual - q;
}

/** Mínimo zero significa "não controlo mínimo", então nunca alerta. */
export function abaixoDoMinimo({ saldo, minimo } = {}) {
  const m = Number(minimo) || 0;
  return m > 0 && (Number(saldo) || 0) < m;
}
