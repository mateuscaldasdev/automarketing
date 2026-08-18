/**
 * Banner em ASCII art, sem dependência de figlet.
 *
 * Só as 11 letras de AUTO MARKETING estão desenhadas — o resto do alfabeto
 * seria peso morto. Cada letra tem exatamente 6 linhas.
 */

const LETRAS = {
  A: [
    ' █████╗ ',
    '██╔══██╗',
    '███████║',
    '██╔══██║',
    '██║  ██║',
    '╚═╝  ╚═╝',
  ],
  U: [
    '██╗   ██╗',
    '██║   ██║',
    '██║   ██║',
    '██║   ██║',
    '╚██████╔╝',
    ' ╚═════╝ ',
  ],
  T: [
    '████████╗',
    '╚══██╔══╝',
    '   ██║   ',
    '   ██║   ',
    '   ██║   ',
    '   ╚═╝   ',
  ],
  O: [
    ' ██████╗ ',
    '██╔═══██╗',
    '██║   ██║',
    '██║   ██║',
    '╚██████╔╝',
    ' ╚═════╝ ',
  ],
  M: [
    '███╗   ███╗',
    '████╗ ████║',
    '██╔████╔██║',
    '██║╚██╔╝██║',
    '██║ ╚═╝ ██║',
    '╚═╝     ╚═╝',
  ],
  R: [
    '██████╗ ',
    '██╔══██╗',
    '██████╔╝',
    '██╔══██╗',
    '██║  ██║',
    '╚═╝  ╚═╝',
  ],
  K: [
    '██╗  ██╗',
    '██║ ██╔╝',
    '█████╔╝ ',
    '██╔═██╗ ',
    '██║  ██╗',
    '╚═╝  ╚═╝',
  ],
  E: [
    '███████╗',
    '██╔════╝',
    '█████╗  ',
    '██╔══╝  ',
    '███████╗',
    '╚══════╝',
  ],
  I: [
    '██╗',
    '██║',
    '██║',
    '██║',
    '██║',
    '╚═╝',
  ],
  N: [
    '███╗   ██╗',
    '████╗  ██║',
    '██╔██╗ ██║',
    '██║╚██╗██║',
    '██║ ╚████║',
    '╚═╝  ╚═══╝',
  ],
  G: [
    ' ██████╗ ',
    '██╔════╝ ',
    '██║  ███╗',
    '██║   ██║',
    '╚██████╔╝',
    ' ╚═════╝ ',
  ],
};

const ALTURA = 6;

/** Junta as letras lado a lado, linha por linha. */
function escrever(palavra) {
  const linhas = Array.from({ length: ALTURA }, () => '');
  for (const letra of palavra) {
    const desenho = LETRAS[letra];
    if (!desenho) continue;
    for (let i = 0; i < ALTURA; i++) linhas[i] += desenho[i];
  }
  return linhas;
}

export function arte() {
  const cima = escrever('AUTO');
  const baixo = escrever('MARKETING');

  // "AUTO" é bem mais estreito que "MARKETING": centralizado, parece proposital.
  const larguraBaixo = [...baixo[0]].length;
  const recuo = ' '.repeat(Math.floor((larguraBaixo - [...cima[0]].length) / 2));

  return [...cima.map((l) => recuo + l), ...baixo];
}

/** Largura da maior linha — usada para decidir se cabe no terminal. */
export function largura() {
  return Math.max(...arte().map((l) => [...l].length));
}
