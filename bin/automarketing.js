#!/usr/bin/env node
import path from 'node:path';
import { REGISTRY, findItem } from '../src/registry.js';
import { installAll } from '../src/install.js';
import { banner, multiselect, c } from '../src/ui.js';
import { perguntar, salvarPerfil, jaFezOnboarding, lerPerfil } from '../src/onboarding.js';

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};

/** Flags que consomem o próximo argumento como valor. */
const FLAGS_COM_VALOR = ['--dir'];

/** Argumentos posicionais: tudo que não é flag nem valor de flag. */
const posicionais = argv.filter((arg, i) => {
  if (arg.startsWith('-')) return false;
  const anterior = argv[i - 1];
  return !(anterior && FLAGS_COM_VALOR.includes(anterior));
});

const cwd = path.resolve(valueOf('--dir') || process.cwd());
const force = has('--force');

function printHelp() {
  banner();
  console.log(`${c.bold('Uso')}
  npx automarketing              instala escolhendo no menu
  npx automarketing list         lista os squads disponíveis
  npx automarketing add <ids>    instala squads por id
  npx automarketing --all        instala tudo

${c.bold('Opções')}
  --dir <caminho>    projeto de destino (padrão: diretório atual)
  --force            sobrescreve o que já existe
  --onboarding       refaz as perguntas de onboarding
  --sem-onboarding   pula as perguntas e vai direto ao menu
  --help             esta ajuda

${c.dim('O onboarding roda na primeira instalação do projeto e grava .automarketing/cliente.md,')}
${c.dim('que as skills leem depois em vez de perguntar tudo de novo ao cliente.')}
`);
}

function printList() {
  banner();
  let group = '';
  for (const item of REGISTRY) {
    if (item.group !== group) {
      group = item.group;
      console.log(c.bold(`\n  ${group}`));
    }
    console.log(`  ${c.magenta(item.id.padEnd(34))} ${c.dim(`[${item.kind}]`)} ${item.description}`);
  }
  console.log('');
}

function summarize(results) {
  const ok = results.filter((r) => r.status === 'ok');
  const skipped = results.filter((r) => r.status === 'skipped');
  const failed = results.filter((r) => r.status === 'error');

  console.log('');
  console.log(`${c.bold('Resumo:')} ${c.green(ok.length + ' instalado(s)')}, ${c.yellow(skipped.length + ' ignorado(s)')}, ${c.red(failed.length + ' erro(s)')}`);

  if (ok.some((r) => r.item.kind === 'skill' || r.item.kind === 'agent')) {
    console.log(c.dim('  Reinicie o Claude Code para carregar as skills e agentes.'));
  }
  if (ok.some((r) => r.item.id === 'crm')) {
    console.log(`\n${c.bold('CRM instalado.')} Para rodar:`);
    console.log(c.dim('  cd crm && npm install && npm run dev'));
    console.log(c.dim('  http://localhost:3333'));
    console.log(c.dim('  Abre em modo demonstração; preencha o .env.local para usar o Supabase.'));
  }
  console.log('');
  return failed.length > 0 ? 1 : 0;
}

async function main() {
  if (has('--help') || has('-h') || posicionais[0] === 'help') return printHelp();
  if (posicionais[0] === 'list' || has('--list')) return printList();

  banner();
  console.log(`${c.dim('Projeto de destino:')} ${cwd}\n`);

  let ids;
  let perfil = null;

  if (has('--all')) {
    ids = REGISTRY.map((i) => i.id);
  } else if (posicionais[0] === 'add') {
    ids = posicionais.slice(1);
    if (!ids.length) {
      console.error(c.red('Informe ao menos um id. Ex: npx automarketing add crm n8n'));
      process.exit(1);
    }
  } else {
    // Onboarding: só na primeira vez neste projeto (a menos que forçado).
    let sugeridos = [];
    const pular = has('--sem-onboarding') || (jaFezOnboarding(cwd) && !has('--onboarding'));

    if (pular) {
      const existente = lerPerfil(cwd);
      if (existente) {
        console.log(`${c.dim('Perfil já configurado:')} ${c.bold(existente.cliente)} ${c.dim('· ' + existente.negocio)}`);
        console.log(c.dim('Use --onboarding para refazer as perguntas.\n'));
      }
    } else {
      const resultado = await perguntar(cwd);
      perfil = resultado.perfil;
      sugeridos = resultado.sugeridos;
    }

    if (perfil && sugeridos.length) {
      console.log(c.dim('  Já marcamos o que costuma fazer sentido nesse tipo de negócio — ajuste à vontade.\n'));
    }

    const titulo = perfil
      ? '  5. Quais ferramentas você precisa neste projeto?'
      : '  O que você quer instalar neste projeto?';

    ids = await multiselect(titulo, REGISTRY.map((item) => ({
      value: item.id,
      label: item.name,
      hint: `[${item.kind}]`,
      selected: sugeridos.includes(item.id),
    })));
  }

  const items = ids.map((id) => {
    const item = findItem(id);
    if (!item) {
      console.error(c.red(`Squad desconhecido: ${id}`));
      process.exit(1);
    }
    return item;
  });

  if (!items.length) {
    console.log(c.yellow('Nada selecionado. Até mais.'));
    return;
  }

  console.log(c.bold('Instalando...\n'));
  const results = installAll(items, cwd, { force });

  if (perfil) {
    const instalados = results.filter((r) => r.status !== 'error').map((r) => r.item);
    const arquivo = salvarPerfil(cwd, perfil, instalados);
    console.log(`  ${c.green('✔')} Perfil do cliente ${c.dim('→ ' + path.relative(cwd, arquivo))}`);
  }

  process.exitCode = summarize(results);
}

main().catch((err) => {
  console.error(c.red('\nErro: ') + err.message);
  process.exit(1);
});
