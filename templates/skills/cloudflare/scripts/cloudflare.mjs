#!/usr/bin/env node
/**
 * Cliente da API do Cloudflare para o padrão de DNS da Automarketing.
 * Zero dependências. Node 18+.
 *
 * Requer: CLOUDFLARE_API_TOKEN (token com permissão Zone:DNS:Edit e Zone:Zone:Read)
 *
 * Uso:
 *   node cloudflare.mjs zonas
 *   node cloudflare.mjs listar <dominio>
 *   node cloudflare.mjs vps <dominio> <ip>              # cria/atualiza o A vps.<dominio>
 *   node cloudflare.mjs sub <dominio> <sub> [alvo]      # cria/atualiza CNAME sub -> vps.<dominio>
 *   node cloudflare.mjs subs <dominio> <sub1> <sub2>... # vários de uma vez
 *   node cloudflare.mjs apagar <dominio> <nome>
 *   node cloudflare.mjs checar <dominio> <sub>          # confere tipo, alvo e proxy
 */

const API = 'https://api.cloudflare.com/client/v4';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!TOKEN) {
  console.error('Erro: defina CLOUDFLARE_API_TOKEN.');
  console.error('Crie em: Cloudflare → My Profile → API Tokens → Create Token');
  console.error('Permissões: Zone:Zone:Read + Zone:DNS:Edit, escopo na zona do cliente.');
  process.exit(1);
}

async function cf(caminho, opts = {}) {
  const res = await fetch(`${API}${caminho}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!json.success) {
    const msg = (json.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ');
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return json.result;
}

async function zonaId(dominio) {
  const zonas = await cf(`/zones?name=${encodeURIComponent(dominio)}`);
  if (!zonas.length) throw new Error(`Zona não encontrada: ${dominio}. O domínio está nesta conta do Cloudflare?`);
  return zonas[0].id;
}

/** Cria ou atualiza — nunca duplica registro. */
async function upsert(zone, { type, name, content, proxied = false, ttl = 1 }) {
  const existentes = await cf(`/zones/${zone}/dns_records?name=${encodeURIComponent(name)}`);
  const igual = existentes.find((r) => r.type === type);
  const corpo = { type, name, content, ttl, proxied };

  if (igual) {
    const r = await cf(`/zones/${zone}/dns_records/${igual.id}`, { method: 'PUT', body: corpo });
    console.log(`  ~ ${r.type.padEnd(5)} ${r.name} → ${r.content} ${r.proxied ? '(proxy ON)' : '(proxy off)'} [atualizado]`);
    return r;
  }
  const r = await cf(`/zones/${zone}/dns_records`, { method: 'POST', body: corpo });
  console.log(`  + ${r.type.padEnd(5)} ${r.name} → ${r.content} ${r.proxied ? '(proxy ON)' : '(proxy off)'} [criado]`);
  return r;
}

const [comando, ...args] = process.argv.slice(2);

try {
  if (comando === 'zonas') {
    const zonas = await cf('/zones?per_page=50');
    zonas.forEach((z) => console.log(`  ${z.name.padEnd(34)} ${z.status.padEnd(10)} ${z.id}`));

  } else if (comando === 'listar') {
    const [dominio] = args;
    const zone = await zonaId(dominio);
    const regs = await cf(`/zones/${zone}/dns_records?per_page=100`);
    regs
      .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
      .forEach((r) => console.log(
        `  ${r.type.padEnd(6)} ${r.name.padEnd(38)} → ${String(r.content).padEnd(34)} ${r.proxied ? 'proxy ON' : 'somente DNS'}`,
      ));

  } else if (comando === 'vps') {
    const [dominio, ip] = args;
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip || '')) throw new Error('IP inválido. Uso: vps <dominio> <ip>');
    const zone = await zonaId(dominio);
    console.log(`Registro base da VPS em ${dominio}:`);
    // O A da VPS fica sem proxy: é o alvo dos CNAMEs e precisa resolver no IP real.
    await upsert(zone, { type: 'A', name: `vps.${dominio}`, content: ip, proxied: false });

  } else if (comando === 'sub' || comando === 'subs') {
    const [dominio, ...subs] = args;
    const zone = await zonaId(dominio);
    const alvo = `vps.${dominio}`;
    // Garante que o alvo existe antes de criar CNAME apontando para o vazio.
    const base = await cf(`/zones/${zone}/dns_records?name=${encodeURIComponent(alvo)}`);
    if (!base.length) throw new Error(`${alvo} não existe. Rode primeiro: node cloudflare.mjs vps ${dominio} <ip>`);

    console.log(`Subdomínios apontando para ${alvo}:`);
    for (const sub of subs) {
      const nome = sub.includes('.') ? sub : `${sub}.${dominio}`;
      await upsert(zone, { type: 'CNAME', name: nome, content: alvo, proxied: false });
    }

  } else if (comando === 'apagar') {
    const [dominio, nome] = args;
    const zone = await zonaId(dominio);
    const alvo = nome.includes('.') ? nome : `${nome}.${dominio}`;
    const regs = await cf(`/zones/${zone}/dns_records?name=${encodeURIComponent(alvo)}`);
    if (!regs.length) throw new Error(`Nenhum registro chamado ${alvo}`);
    for (const r of regs) {
      await cf(`/zones/${zone}/dns_records/${r.id}`, { method: 'DELETE' });
      console.log(`  - ${r.type} ${r.name} removido`);
    }

  } else if (comando === 'checar') {
    const [dominio, sub] = args;
    const zone = await zonaId(dominio);
    const alvo = sub.includes('.') ? sub : `${sub}.${dominio}`;
    const regs = await cf(`/zones/${zone}/dns_records?name=${encodeURIComponent(alvo)}`);
    if (!regs.length) { console.log(`  ✖ ${alvo} não existe`); process.exitCode = 1; }
    else
    for (const r of regs) {
      const problemas = [];
      if (r.proxied) problemas.push('proxy LIGADO — o Let\'s Encrypt não emite assim; desligue (somente DNS)');
      if (r.type === 'CNAME' && r.content !== `vps.${dominio}`) problemas.push(`aponta para ${r.content}, não para vps.${dominio}`);
      console.log(`  ${problemas.length ? '✖' : '✔'} ${r.type} ${r.name} → ${r.content}`);
      problemas.forEach((p) => console.log(`      ${p}`));
    }

  } else {
    console.log(`Comandos:
  zonas                            lista as zonas da conta
  listar <dominio>                 lista os registros da zona
  vps <dominio> <ip>               cria/atualiza o A vps.<dominio> (proxy off)
  sub <dominio> <sub> [sub2...]    cria/atualiza CNAMEs apontando para vps.<dominio>
  apagar <dominio> <nome>
  checar <dominio> <sub>           confere alvo e proxy`);
  }
} catch (err) {
  console.error(`Erro: ${err.message}`);
  // exitCode em vez de exit(): com fetch pendente, process.exit() estoura
  // uma asserção do libuv no Windows.
  process.exitCode = 1;
}
