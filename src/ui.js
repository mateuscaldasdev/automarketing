/** Prompts e cores sem dependências externas. */

import { arte, largura } from './banner.js';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code) => (s) => (useColor ? `[${code}m${s}[0m` : s);

/** Roxo da marca em 256 cores, com queda para o magenta padrão. */
const roxo = (s) => (useColor ? `[1m[38;5;141m${s}[0m` : s);

export const c = {
  bold: wrap('1'),
  dim: wrap('2'),
  red: wrap('31'),
  green: wrap('32'),
  yellow: wrap('33'),
  blue: wrap('36'),
  magenta: wrap('35'),
};

export function banner() {
  const colunas = process.stdout.columns || 80;
  console.log('');

  // Só desenha a arte se couber. Em terminal estreito ela quebraria em pedaços.
  if (colunas >= largura() + 2) {
    for (const linha of arte()) console.log(' ' + roxo(linha));
    console.log('');
    console.log(' ' + c.dim('cli · squads prontos para o seu projeto'));
  } else {
    console.log('  ' + roxo('▰▰▰') + ' ' + c.bold('AUTOMARKETING') + c.dim('  cli'));
    console.log(c.dim('      squads prontos para o seu projeto'));
  }

  console.log('');
}

/**
 * Multi-select com setas + espaço + enter.
 * options: [{ value, label, hint, selected }]
 */
export function multiselect(title, options, { unico = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('Terminal não interativo. Use: automarketing --all  ou  automarketing add <ids>'));
      return;
    }

    const state = options.map((o) => ({ ...o, selected: Boolean(o.selected) }));
    let cursor = 0;
    let rendered = 0;

    const render = () => {
      if (rendered) process.stdout.write(`[${rendered}A`);
      const lines = [];
      lines.push(c.bold(title));
      lines.push(c.dim(unico
        ? '  ↑/↓ mover · enter escolher'
        : '  ↑/↓ mover · espaço marcar · a marcar tudo · enter confirmar'));
      state.forEach((o, i) => {
        const pointer = i === cursor ? c.magenta('❯') : ' ';
        const marcado = unico ? i === cursor : o.selected;
        const box = unico ? (marcado ? c.green('●') : c.dim('○')) : (marcado ? c.green('◉') : c.dim('◯'));
        const label = i === cursor ? c.bold(o.label) : o.label;
        lines.push(`${pointer} ${box} ${label} ${c.dim(o.hint || '')}`);
      });
      lines.push('');
      const out = lines.map((l) => `[2K${l}`).join('\n');
      process.stdout.write(out + '\n');
      rendered = lines.length + 1;
    };

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
    };

    const onData = (buf) => {
      const key = buf.toString();
      if (key === '' || key === '') {
        cleanup();
        console.log(c.dim('\nCancelado.'));
        process.exit(130);
      } else if (key === '[A' || key === 'k') {
        cursor = (cursor - 1 + state.length) % state.length;
      } else if (key === '[B' || key === 'j') {
        cursor = (cursor + 1) % state.length;
      } else if (key === ' ' && !unico) {
        state[cursor].selected = !state[cursor].selected;
      } else if ((key === 'a' || key === 'A') && !unico) {
        const allOn = state.every((o) => o.selected);
        state.forEach((o) => { o.selected = !allOn; });
      } else if (key === '\r' || key === '\n') {
        cleanup();
        console.log('');
        resolve(unico ? [state[cursor].value] : state.filter((o) => o.selected).map((o) => o.value));
        return;
      }
      render();
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
    render();
  });
}

/** Seleção única com setas + enter. */
export async function select(title, options) {
  const escolha = await multiselect(title, options, { unico: true });
  return escolha[0];
}

/** Campo de texto simples. */
export function text(pergunta, padrao = '') {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) return resolve(padrao);
    const dica = padrao ? c.dim(` (${padrao})`) : '';
    process.stdout.write(`${c.bold(pergunta)}${dica} `);
    let buffer = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onData = (buf) => {
      const ch = buf.toString();
      if (ch === '') { console.log(''); process.exit(130); }
      if (ch === '\r' || ch === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        console.log('');
        return resolve(buffer.trim() || padrao);
      }
      if (ch === '' || ch === '\b') {
        if (buffer.length) { buffer = buffer.slice(0, -1); process.stdout.write('\b \b'); }
        return;
      }
      if (ch >= ' ') { buffer += ch; process.stdout.write(ch); }
    };
    process.stdin.on('data', onData);
  });
}

export function confirm(question, defaultYes = true) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) return resolve(defaultYes);
    const suffix = defaultYes ? c.dim('(S/n)') : c.dim('(s/N)');
    process.stdout.write(`${question} ${suffix} `);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', (buf) => {
      const key = buf.toString().toLowerCase();
      process.stdin.setRawMode(false);
      process.stdin.pause();
      if (key === '') { console.log(''); process.exit(130); }
      const yes = key === 's' || key === 'y' || key === '\r' || key === '\n' ? (key === '\r' || key === '\n' ? defaultYes : true) : false;
      console.log(yes ? c.green('sim') : c.yellow('não'));
      resolve(yes);
    });
  });
}
