/** Persistência em arquivo JSON. Zero dependências, suficiente para rodar e demonstrar. */
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY = {
  leads: [],
  produtos: [],
  movimentacoes: [],
  mensagens: [],
  seq: { lead: 1, produto: 1, movimentacao: 1, mensagem: 1 },
};

let cache = null;

function seed() {
  const db = structuredClone(EMPTY);
  const now = new Date().toISOString();
  db.leads.push(
    { id: 1, nome: 'Maria Souza', telefone: '5511988887777', email: 'maria@exemplo.com', origem: 'site', etapa: 'novo', valor: 1200, obs: 'Pediu orçamento de 50 unidades', criadoEm: now, atualizadoEm: now },
    { id: 2, nome: 'João Lima', telefone: '5511977776666', email: '', origem: 'whatsapp', etapa: 'contato', valor: 350, obs: '', criadoEm: now, atualizadoEm: now },
    { id: 3, nome: 'Ana Prado', telefone: '5511966665555', email: 'ana@exemplo.com', origem: 'indicacao', etapa: 'ganho', valor: 4800, obs: 'Fechou pacote anual', criadoEm: now, atualizadoEm: now },
  );
  db.seq.lead = 4;
  db.produtos.push(
    { id: 1, sku: 'BAL-100', nome: 'Balão Metalizado 40cm', preco: 12.9, estoque: 120, estoqueMinimo: 30, criadoEm: now },
    { id: 2, sku: 'ARC-DES', nome: 'Arco Desconstruído (kit)', preco: 189.0, estoque: 8, estoqueMinimo: 10, criadoEm: now },
    { id: 3, sku: 'FIT-VER', nome: 'Fita de Cetim Vermelha 10m', preco: 6.5, estoque: 4, estoqueMinimo: 15, criadoEm: now },
  );
  db.seq.produto = 4;
  return db;
}

export function load() {
  if (cache) return cache;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try {
      cache = { ...structuredClone(EMPTY), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
    } catch {
      console.warn('[db] db.json inválido, recriando com dados de exemplo.');
      cache = seed();
      save();
    }
  } else {
    cache = seed();
    save();
  }
  return cache;
}

export function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2));
}

export function nextId(entidade) {
  const db = load();
  const id = db.seq[entidade] || 1;
  db.seq[entidade] = id + 1;
  return id;
}
