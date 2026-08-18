import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { c } from './ui.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATES = path.join(__dirname, '..', 'templates');

/**
 * Nunca copiado para o projeto do cliente: sujeira de desenvolvimento que
 * aparece quando alguém roda o template aqui dentro. Sem isso, um `npm install`
 * feito no template manda centenas de MB para a máquina de quem instala.
 */
const NAO_COPIAR = new Set([
  'node_modules',
  '.next',
  '.env',
  '.env.local',
  'data',
  '.turbo',
  '.DS_Store',
]);

function ignorado(nome) {
  return NAO_COPIAR.has(nome) || nome.endsWith('.log');
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (ignorado(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function destinationFor(item, cwd) {
  if (item.kind === 'skill') return path.join(cwd, '.claude', 'skills', item.id);
  if (item.kind === 'agent') return path.join(cwd, '.claude', 'agents', `${item.id}.md`);
  return path.join(cwd, item.target || item.id);
}

function sourceFor(item) {
  if (item.kind === 'skill') return path.join(TEMPLATES, 'skills', item.id);
  if (item.kind === 'agent') return path.join(TEMPLATES, 'agents', `${item.id}.md`);
  return path.join(TEMPLATES, 'apps', item.id);
}

/** Instala um item. Retorna { status: 'ok'|'skipped'|'error', dest, reason? } */
export function installItem(item, cwd, { force = false } = {}) {
  const src = sourceFor(item);
  const dest = destinationFor(item, cwd);

  if (!fs.existsSync(src)) {
    return { status: 'error', dest, reason: `template ausente: ${src}` };
  }
  if (fs.existsSync(dest) && !force) {
    return { status: 'skipped', dest, reason: 'já existe (use --force para sobrescrever)' };
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.statSync(src).isDirectory()) {
    if (force && fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
  return { status: 'ok', dest };
}

export function installAll(items, cwd, opts) {
  const results = [];
  for (const item of items) {
    const r = installItem(item, cwd, opts);
    results.push({ item, ...r });
    const rel = path.relative(cwd, r.dest) || '.';
    if (r.status === 'ok') console.log(`  ${c.green('✔')} ${item.name} ${c.dim('→ ' + rel)}`);
    else if (r.status === 'skipped') console.log(`  ${c.yellow('•')} ${item.name} ${c.dim(r.reason)}`);
    else console.log(`  ${c.red('✖')} ${item.name} ${c.dim(r.reason)}`);
  }
  return results;
}
