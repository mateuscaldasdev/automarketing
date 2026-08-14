#!/usr/bin/env node
/** CRM Automarketing — servidor HTTP sem dependências externas. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rotear } from './src/rotas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 3333;

carregarEnv();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function carregarEnv() {
  const arquivo = path.join(process.cwd(), '.env');
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, 'utf8').split('\n')) {
    const t = linha.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const chave = t.slice(0, i).trim();
    const valor = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!(chave in process.env)) process.env[chave] = valor;
  }
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let bruto = '';
    req.on('data', (chunk) => {
      bruto += chunk;
      if (bruto.length > 1_000_000) { req.destroy(); reject(new Error('corpo muito grande')); }
    });
    req.on('end', () => {
      if (!bruto) return resolve({});
      try { resolve(JSON.parse(bruto)); }
      catch { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

function servirEstatico(caminho, res) {
  const arquivo = caminho === '/' ? '/index.html' : caminho;
  const destino = path.join(PUBLIC_DIR, path.normalize(arquivo).replace(/^([/\\])+/, ''));
  if (!destino.startsWith(PUBLIC_DIR) || !fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(destino)] || 'application/octet-stream' });
  fs.createReadStream(destino).pipe(res);
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const caminho = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const ehApi = caminho.startsWith('/api/') || caminho.startsWith('/webhook/') || caminho === '/health';
  if (!ehApi) return servirEstatico(caminho, res);

  try {
    const corpo = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await lerCorpo(req) : {};
    const resultado = await rotear(req.method, caminho, corpo);
    if (!resultado) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ erro: 'rota não encontrada', caminho }));
    }
    res.writeHead(resultado.status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(resultado.body));
  } catch (err) {
    console.error('[erro]', req.method, caminho, err.message);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ erro: err.message }));
  }
});

servidor.listen(PORT, () => {
  console.log(`\n  CRM Automarketing rodando em http://localhost:${PORT}`);
  console.log(`  WhatsApp: ${process.env.EVOLUTION_URL ? 'configurado' : 'não configurado (.env)'}`);
  console.log(`  n8n:      ${process.env.N8N_WEBHOOK_URL ? 'configurado' : 'não configurado (.env)'}\n`);
});
