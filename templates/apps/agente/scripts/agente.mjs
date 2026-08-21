#!/usr/bin/env node
/**
 * Ferramenta do Modelo de Agente Conversacional da Automarketing.
 *
 *   node scripts/agente.mjs validar     confere o padrão. Reprova antes de gerar.
 *   node scripts/agente.mjs gerar       escreve o fluxo do n8n e sincroniza o enum
 *   node scripts/agente.mjs semear      empacota tudo em JSON para o CRM carregar
 *   node scripts/agente.mjs exportar    volta do JSON do CRM para os arquivos
 *
 * Zero dependência: só `node:fs` e `node:path`. Roda em Windows, Mac e Linux.
 *
 * O YAML aceito é um subconjunto deliberado — mapa, lista de mapas, lista
 * embutida e comentário de linha inteira. Nada de âncora, bloco literal ou
 * mapa aninhado dentro de item de lista. É o bastante para o manifesto e evita
 * arrastar uma biblioteca para dentro do projeto de quem instala.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A pasta do agente é a de cima desta, não o diretório de onde se chamou.
 *
 * A documentação manda rodar da raiz do projeto (`node agente/scripts/agente.mjs
 * validar`), e usar `process.cwd()` faria o script procurar o manifesto na raiz
 * e não achar. Passar um caminho como argumento continua funcionando.
 */
const PASTA_DO_AGENTE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------- YAML mínimo ------------------------------ */

function valor(bruto) {
  const t = bruto.trim();
  if (t === '') return '';
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^\[.*\]$/.test(t)) {
    const dentro = t.slice(1, -1).trim();
    return dentro ? dentro.split(',').map((x) => valor(x)) : [];
  }
  if (/^".*"$/.test(t) || /^'.*'$/.test(t)) return t.slice(1, -1);
  if (/^-?\d+$/.test(t)) return Number(t);
  return t;
}

export function lerYaml(texto) {
  const linhas = texto
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '' && !/^\s*#/.test(l));

  const raiz = {};
  let chaveTopo = null;

  for (const linha of linhas) {
    const recuo = linha.length - linha.trimStart().length;
    const corpo = linha.trim();

    if (recuo === 0) {
      const [, chave, resto] = corpo.match(/^([\w-]+):\s*(.*)$/) || [];
      if (!chave) continue;
      chaveTopo = chave;
      raiz[chave] = resto === '' ? undefined : valor(resto);
      continue;
    }
    if (!chaveTopo) continue;

    if (corpo.startsWith('- ')) {
      if (!Array.isArray(raiz[chaveTopo])) raiz[chaveTopo] = [];
      const item = {};
      const [, chave, resto] = corpo.slice(2).match(/^([\w-]+):\s*(.*)$/) || [];
      if (chave) item[chave] = valor(resto);
      raiz[chaveTopo].push(item);
      continue;
    }

    const [, chave, resto] = corpo.match(/^([\w-]+):\s*(.*)$/) || [];
    if (!chave) continue;

    if (Array.isArray(raiz[chaveTopo])) {
      raiz[chaveTopo][raiz[chaveTopo].length - 1][chave] = valor(resto);
    } else {
      if (typeof raiz[chaveTopo] !== 'object' || raiz[chaveTopo] === null) raiz[chaveTopo] = {};
      raiz[chaveTopo][chave] = valor(resto);
    }
  }
  return raiz;
}

/* --------------------------------- leitura -------------------------------- */

const BLOCOS_CLASSIFICADOR = ['identidade', 'principio', 'funil', 'regra-de-ouro', 'regras'];
const BLOCOS_RAMO = ['ordem', 'tools', 'regras', 'interacao'];

const MARCA_INICIO = '<!-- gerado a partir de agente.yml — não editar à mão -->';
const MARCA_FIM = '<!-- fim -->';

function carregar(pasta) {
  const arquivo = path.join(pasta, 'agente.yml');
  if (!fs.existsSync(arquivo)) {
    throw new Error(`Não achei agente.yml em ${pasta}`);
  }
  const manifesto = lerYaml(fs.readFileSync(arquivo, 'utf8'));
  return { pasta, arquivo, manifesto };
}

const ramos = (m) => [...(m.etapas || []), ...(m.desvios || [])];
const tokens = (m) => ramos(m).map((r) => String(r.token));

/**
 * Exige abertura E fechamento.
 *
 * Só a abertura não serve: o bloco <ordem> MENCIONA <regras> e <interacao> em
 * prosa, e a checagem passaria num prompt que perdeu o bloco de verdade. Foi
 * assim que este validador deixou passar um arquivo quebrado no primeiro teste.
 */
function temBloco(texto, nome) {
  return new RegExp(`<${nome}[^>]*>[\\s\\S]*?</${nome}>`).test(texto);
}

function blocoEnum(manifesto) {
  return tokens(manifesto).map((t) => `\`${t}\``).join(' · ');
}

/* -------------------------------- validar --------------------------------- */

export function validar(pasta) {
  const { manifesto } = carregar(pasta);
  const erros = [];
  const reprovar = (m) => erros.push(m);

  if (!manifesto.agente?.nome) reprovar('agente.nome não declarado.');
  if (!manifesto.agente?.canal) reprovar('agente.canal não declarado.');
  if (!manifesto.classificador?.prompt) reprovar('classificador.prompt não declarado.');

  const listaTokens = tokens(manifesto);
  if (!listaTokens.length) reprovar('Nenhuma etapa nem desvio declarado.');

  const repetidos = listaTokens.filter((t, i) => listaTokens.indexOf(t) !== i);
  if (repetidos.length) reprovar(`Token repetido: ${[...new Set(repetidos)].join(', ')}`);

  // Regra 4 do padrão: sem destino seguro o agente quebra em vez de degradar.
  const seguro = manifesto.classificador?.destino_seguro;
  if (!seguro) reprovar('classificador.destino_seguro não declarado — o agente cairia em erro.');
  else if (!listaTokens.includes(String(seguro))) {
    reprovar(`destino_seguro "${seguro}" não é um token declarado.`);
  }

  const idsTools = new Set((manifesto.tools || []).map((t) => t.id));

  for (const t of manifesto.tools || []) {
    if (!t.id) reprovar('Uma ferramenta está sem id.');
    if (!t.descricao) reprovar(`Ferramenta "${t.id}" está sem descrição — o modelo não saberia quando acioná-la.`);
  }

  // Classificador
  const caminhoCls = path.join(pasta, manifesto.classificador?.prompt || '');
  if (!fs.existsSync(caminhoCls)) {
    reprovar(`Prompt do classificador não existe: ${manifesto.classificador?.prompt}`);
  } else {
    const texto = fs.readFileSync(caminhoCls, 'utf8');
    for (const bloco of BLOCOS_CLASSIFICADOR) {
      if (!temBloco(texto, bloco)) reprovar(`classificador: falta o bloco <${bloco}>.`);
    }
    if ((manifesto.desvios || []).length && !temBloco(texto, 'desvios')) {
      reprovar('classificador: há desvios declarados, mas falta o bloco <desvios>.');
    }
    if (!texto.includes(MARCA_INICIO)) {
      reprovar('classificador: falta o bloco de tokens gerado. Rode `gerar`.');
    } else {
      const atual = texto.split(MARCA_INICIO)[1].split(MARCA_FIM)[0].trim();
      if (atual !== blocoEnum(manifesto)) {
        reprovar('classificador: o bloco de tokens está desatualizado. Rode `gerar`.');
      }
    }
    if (!/###\s+Exemplos/i.test(texto)) reprovar('classificador: falta a seção "### Exemplos".');
    for (const token of listaTokens) {
      const alvo = new RegExp(`→\\s*\`?${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\`?`);
      if (!alvo.test(texto)) reprovar(`classificador: o token "${token}" não tem nenhum exemplo.`);
    }
    if (/\{\{/.test(texto)) reprovar('classificador: usa {{ }}. O motor de fluxo avalia e quebra — use [[ ]].');
  }

  // Ramos
  for (const ramo of ramos(manifesto)) {
    const rel = ramo.prompt;
    if (!rel) { reprovar(`Ramo "${ramo.id}" está sem prompt declarado.`); continue; }
    const caminho = path.join(pasta, rel);
    if (!fs.existsSync(caminho)) { reprovar(`Ramo "${ramo.id}": prompt não existe (${rel}).`); continue; }

    const texto = fs.readFileSync(caminho, 'utf8');
    for (const bloco of BLOCOS_RAMO) {
      if (!temBloco(texto, bloco)) reprovar(`${ramo.id}: falta o bloco <${bloco}>.`);
    }
    if (/\{\{/.test(texto)) reprovar(`${ramo.id}: usa {{ }} — use [[ ]].`);

    const interacao = (texto.match(/<interacao[^>]*>([\s\S]*?)<\/interacao/) || [])[1] || '';
    const situacoes = interacao.match(/^\s*\[Situação[^\]]*\]/gim) || [];
    if (!situacoes.length) reprovar(`${ramo.id}: <interacao> não tem nenhuma Situação.`);
    if (situacoes.length && !/"[^"]{10,}"/.test(interacao)) {
      reprovar(`${ramo.id}: nenhuma Situação tem texto literal de resposta entre aspas.`);
    }

    const declaradas = Array.isArray(ramo.tools) ? ramo.tools : [];
    for (const id of declaradas) {
      if (!idsTools.has(id)) reprovar(`${ramo.id}: usa a ferramenta "${id}", que não existe no manifesto.`);
    }
    const blocoTools = (texto.match(/<tools[^>]*>([\s\S]*?)<\/tools/) || [])[1] || '';
    for (const citada of blocoTools.match(/'([\w-]+)'/g) || []) {
      const id = citada.slice(1, -1);
      if (!idsTools.has(id)) reprovar(`${ramo.id}: o prompt cita a ferramenta "${id}", que não existe no manifesto.`);
    }
    // Ferramenta com vários retornos precisa de regra para CADA um, senão o
    // modelo inventa o que fazer no status que ninguém previu.
    for (const id of declaradas) {
      const tool = (manifesto.tools || []).find((t) => t.id === id);
      const status = Array.isArray(tool?.status) ? tool.status : [];
      if (status.length < 2) continue;
      const faltando = status.filter((s) => !blocoTools.includes(`"${s}"`) && !blocoTools.includes(`\`${s}\``));
      if (faltando.length) {
        reprovar(`${ramo.id}: a ferramenta "${id}" devolve ${status.join('/')}, mas o prompt não diz o que fazer com: ${faltando.join(', ')}.`);
      }
    }
  }

  // Prompt órfão: arquivo na pasta que nenhum ramo declara.
  const pastaPrompts = path.join(pasta, 'prompts');
  if (fs.existsSync(pastaPrompts)) {
    const usados = new Set([manifesto.classificador?.prompt, ...ramos(manifesto).map((r) => r.prompt)]);
    for (const nome of fs.readdirSync(pastaPrompts)) {
      if (!nome.endsWith('.md')) continue;
      if (!usados.has(`prompts/${nome}`)) {
        reprovar(`prompts/${nome} não é usado por nenhum ramo do manifesto.`);
      }
    }
  }

  return erros;
}

/* --------------------------------- gerar ---------------------------------- */

function sincronizarEnum(pasta, manifesto) {
  const caminho = path.join(pasta, manifesto.classificador.prompt);
  const texto = fs.readFileSync(caminho, 'utf8');
  if (!texto.includes(MARCA_INICIO)) return false;
  const [antes, resto] = texto.split(MARCA_INICIO);
  const depois = resto.split(MARCA_FIM)[1];
  const novo = `${antes}${MARCA_INICIO}\n${blocoEnum(manifesto)}\n${MARCA_FIM}${depois}`;
  if (novo === texto) return false;
  fs.writeFileSync(caminho, novo);
  return true;
}

/**
 * Fluxo do n8n: webhook → classificador → normalizador → roteador → ramo.
 *
 * O roteador usa `options.fallbackOutput: "extra"` mais `renameFallbackOutput`.
 * Apontar o fallback direto pelo nome é inválido e o n8n descarta a conexão em
 * silêncio na importação — o fluxo importa "certo" e não roteia.
 */
function fluxoN8n(manifesto, prompts) {
  const lista = ramos(manifesto);
  const nos = [];
  const conexoes = {};
  const ligar = (de, para, saida = 0) => {
    conexoes[de] = conexoes[de] || { main: [] };
    while (conexoes[de].main.length <= saida) conexoes[de].main.push([]);
    conexoes[de].main[saida].push({ node: para, type: 'main', index: 0 });
  };

  nos.push({
    parameters: { httpMethod: 'POST', path: `agente-${manifesto.agente.canal}`, options: {} },
    id: 'webhook', name: 'Entrada', type: 'n8n-nodes-base.webhook',
    typeVersion: 2, position: [0, 0],
  });

  nos.push({
    parameters: {
      promptType: 'define',
      text: '=[[mensagem]]',
      options: { systemMessage: prompts.classificador },
    },
    id: 'classificador', name: 'Classificador',
    type: '@n8n/n8n-nodes-langchain.chainLlm', typeVersion: 1.5, position: [220, 0],
  });

  const seguro = String(manifesto.classificador.destino_seguro);
  nos.push({
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: [
        '// Normaliza a saída contra o enum. Nada reconhecido vai para o destino',
        '// seguro: o agente degrada em vez de derrubar o atendimento.',
        `const validos = ${JSON.stringify(tokens(manifesto))};`,
        'const bruto = String($json.text ?? $json.output ?? "").trim();',
        'const achado = validos.find((t) => t.toLowerCase() === bruto.toLowerCase());',
        `return { json: { etapa: achado ?? ${JSON.stringify(seguro)} } };`,
      ].join('\n'),
    },
    id: 'normalizador', name: 'Normalizar etapa',
    type: 'n8n-nodes-base.code', typeVersion: 2, position: [440, 0],
  });

  nos.push({
    parameters: {
      rules: {
        values: lista.map((r) => ({
          conditions: {
            options: { caseSensitive: true, version: 2 },
            conditions: [{
              leftValue: '={{ $json.etapa }}',
              rightValue: String(r.token),
              operator: { type: 'string', operation: 'equals' },
            }],
            combinator: 'and',
          },
          renameOutput: true,
          outputKey: r.id,
        })),
      },
      options: { fallbackOutput: 'extra', renameFallbackOutput: 'nao_reconhecido' },
    },
    id: 'roteador', name: 'Roteador',
    type: 'n8n-nodes-base.switch', typeVersion: 3.2, position: [660, 0],
  });

  ligar('Entrada', 'Classificador');
  ligar('Classificador', 'Normalizar etapa');
  ligar('Normalizar etapa', 'Roteador');

  lista.forEach((r, i) => {
    const nome = `Ramo: ${r.id}`;
    nos.push({
      parameters: {
        promptType: 'define',
        text: '=[[mensagem]]',
        options: { systemMessage: prompts[r.id] || '' },
      },
      id: `ramo_${r.id}`, name: nome,
      type: '@n8n/n8n-nodes-langchain.chainLlm', typeVersion: 1.5,
      position: [900, i * 160 - (lista.length - 1) * 80],
    });
    ligar('Roteador', nome, i);
  });

  // A saída de fallback é a última do roteador e vai para o destino seguro.
  const destino = lista.find((r) => String(r.token) === seguro);
  if (destino) ligar('Roteador', `Ramo: ${destino.id}`, lista.length);

  return {
    name: `Agente ${manifesto.agente.nome}`,
    nodes: nos,
    connections: conexoes,
    settings: { executionOrder: 'v1' },
  };
}

function lerPrompts(pasta, manifesto) {
  const prompts = {
    classificador: fs.readFileSync(path.join(pasta, manifesto.classificador.prompt), 'utf8'),
  };
  for (const r of ramos(manifesto)) {
    prompts[r.id] = fs.readFileSync(path.join(pasta, r.prompt), 'utf8');
  }
  return prompts;
}

export function gerar(pasta) {
  const { manifesto } = carregar(pasta);
  const mudou = sincronizarEnum(pasta, manifesto);

  const erros = validar(pasta);
  if (erros.length) return { erros, mudou };

  const prompts = lerPrompts(pasta, manifesto);
  const destino = path.join(pasta, 'workflow.n8n.json');
  fs.writeFileSync(destino, JSON.stringify(fluxoN8n(manifesto, prompts), null, 2));
  return { erros: [], mudou, destino };
}

/* ---------------------------- semear e exportar ---------------------------- */

export function semear(pasta) {
  const { manifesto } = carregar(pasta);
  const erros = validar(pasta);
  if (erros.length) return { erros };

  const prompts = lerPrompts(pasta, manifesto);
  const pacote = {
    versao: 1,
    agente: { ...manifesto.agente, definicao: manifesto },
    prompts: Object.entries(prompts).map(([chave, conteudo]) => ({
      chave: chave === 'classificador'
        ? 'classificador'
        : (manifesto.etapas || []).some((e) => e.id === chave) ? `etapa-${chave}` : `desvio-${chave}`,
      conteudo,
    })),
  };
  const destino = path.join(pasta, 'semente.json');
  fs.writeFileSync(destino, JSON.stringify(pacote, null, 2));
  return { erros: [], destino };
}

export function exportar(pasta, arquivo) {
  const origem = arquivo || path.join(pasta, 'semente.json');
  if (!fs.existsSync(origem)) throw new Error(`Não achei ${origem}. Baixe o pacote do CRM primeiro.`);
  const pacote = JSON.parse(fs.readFileSync(origem, 'utf8'));
  const { manifesto } = carregar(pasta);

  const escritos = [];
  for (const p of pacote.prompts || []) {
    const id = p.chave.replace(/^(etapa|desvio)-/, '');
    const rel = p.chave === 'classificador'
      ? manifesto.classificador.prompt
      : ramos(manifesto).find((r) => r.id === id)?.prompt;
    if (!rel) continue;
    fs.writeFileSync(path.join(pasta, rel), p.conteudo);
    escritos.push(rel);
  }
  return escritos;
}

/* ---------------------------------- CLI ----------------------------------- */

const cor = {
  ok: (s) => `\u001b[32m${s}\u001b[0m`,
  ruim: (s) => `\u001b[31m${s}\u001b[0m`,
  fraco: (s) => `\u001b[2m${s}\u001b[0m`,
};

function principal() {
  const [comando, ...resto] = process.argv.slice(2);
  const informada = resto.find((a) => !a.startsWith('-') && !a.endsWith('.json'));
  const pasta = informada ? path.resolve(informada) : PASTA_DO_AGENTE;

  try {
    if (comando === 'validar') {
      const erros = validar(pasta);
      if (!erros.length) { console.log(cor.ok('✔ o agente respeita o padrão.')); return; }
      console.log(cor.ruim(`✖ ${erros.length} problema(s):\n`));
      erros.forEach((e) => console.log(`  • ${e}`));
      process.exitCode = 1;
      return;
    }

    if (comando === 'gerar') {
      const { erros, mudou, destino } = gerar(pasta);
      if (mudou) console.log(cor.fraco('  enum do classificador sincronizado com o manifesto'));
      if (erros.length) {
        console.log(cor.ruim(`✖ não gerei nada — ${erros.length} problema(s):\n`));
        erros.forEach((e) => console.log(`  • ${e}`));
        process.exitCode = 1;
        return;
      }
      console.log(cor.ok(`✔ fluxo escrito em ${path.relative(process.cwd(), destino)}`));
      console.log(cor.fraco('  importe no n8n em Workflows → Import from File'));
      return;
    }

    if (comando === 'semear') {
      const { erros, destino } = semear(pasta);
      if (erros.length) {
        console.log(cor.ruim('✖ não semeei — o agente não passou na validação.'));
        erros.forEach((e) => console.log(`  • ${e}`));
        process.exitCode = 1;
        return;
      }
      console.log(cor.ok(`✔ pacote escrito em ${path.relative(process.cwd(), destino)}`));
      return;
    }

    if (comando === 'exportar') {
      const escritos = exportar(pasta, resto.find((a) => a.endsWith('.json')));
      console.log(cor.ok(`✔ ${escritos.length} prompt(s) atualizados a partir do CRM`));
      escritos.forEach((e) => console.log(`  ${e}`));
      return;
    }

    console.log(`Modelo de Agente Conversacional — Automarketing

  node scripts/agente.mjs validar    confere o padrão
  node scripts/agente.mjs gerar      sincroniza o enum e escreve o fluxo do n8n
  node scripts/agente.mjs semear     empacota em JSON para o CRM carregar
  node scripts/agente.mjs exportar   traz de volta o que foi editado no CRM

Rode de dentro da pasta do agente, ou passe o caminho dela como argumento.`);
  } catch (erro) {
    console.log(cor.ruim(`✖ ${erro.message}`));
    process.exitCode = 1;
  }
}

if (process.argv[1] && process.argv[1].endsWith('agente.mjs')) principal();
