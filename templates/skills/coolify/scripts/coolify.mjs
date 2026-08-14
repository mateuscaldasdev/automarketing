#!/usr/bin/env node
/**
 * Cliente da API da Coolify (v1). Zero dependências. Node 18+.
 *
 * Endpoints conferidos contra o openapi.json oficial do repositório coollabsio/coolify.
 * Atenção a duas pegadinhas que a documentação de terceiros erra:
 *   - variáveis de ambiente são /envs, NÃO /environment-variables
 *   - NÃO existe /applications/dockercompose; compose vai em /services com docker_compose_raw
 *
 * Requer:
 *   COOLIFY_URL    ex.: https://coolify.seudominio.com.br
 *   COOLIFY_TOKEN  Keys & Tokens → Create token (permissões read+write+deploy)
 *
 * Uso:
 *   node coolify.mjs servidores
 *   node coolify.mjs projetos
 *   node coolify.mjs criar-projeto <nome>
 *   node coolify.mjs recursos
 *   node coolify.mjs stack <arquivo.yml> <nome> --projeto <uuid> --servidor <uuid> [--dominio https://x] [--deploy]
 *   node coolify.mjs postgres <nome> --projeto <uuid> --servidor <uuid> [--deploy]
 *   node coolify.mjs env <uuid> CHAVE=valor [CHAVE2=valor2] [--app]
 *   node coolify.mjs deploy <uuid> [--force]
 *   node coolify.mjs status <uuid-do-deployment>
 *   node coolify.mjs logs <uuid>
 */

import fs from 'node:fs';

const BASE = (process.env.COOLIFY_URL || '').replace(/\/$/, '');
const TOKEN = process.env.COOLIFY_TOKEN;

if (!BASE || !TOKEN) {
  console.error('Erro: defina COOLIFY_URL e COOLIFY_TOKEN.');
  console.error('Token em: Coolify → Keys & Tokens → Create token (read + write + deploy).');
  process.exit(1);
}

const argv = process.argv.slice(2);
const flag = (nome) => {
  const i = argv.indexOf(`--${nome}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const tem = (nome) => argv.includes(`--${nome}`);
const posicionais = argv.filter((a, i) => {
  if (a.startsWith('--')) return false;
  const ant = argv[i - 1];
  return !(ant && ant.startsWith('--') && !['--deploy', '--force', '--app'].includes(ant));
});

async function api(caminho, opts = {}) {
  const res = await fetch(`${BASE}/api/v1${caminho}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const texto = await res.text();
  let json;
  try { json = texto ? JSON.parse(texto) : {}; } catch { json = { raw: texto }; }

  if (!res.ok) {
    const detalhe = json.message || json.error || json.raw || `HTTP ${res.status}`;
    const campos = json.errors ? ' | ' + JSON.stringify(json.errors) : '';
    throw new Error(`${res.status} — ${detalhe}${campos}`);
  }
  return json;
}

/** Contexto obrigatório em quase todo POST de recurso. */
function contexto() {
  const projeto = flag('projeto') || process.env.COOLIFY_PROJECT_UUID;
  const servidor = flag('servidor') || process.env.COOLIFY_SERVER_UUID;
  if (!projeto || !servidor) {
    throw new Error(
      'Faltou --projeto <uuid> e/ou --servidor <uuid>.\n' +
      '  Descubra com: node coolify.mjs projetos   e   node coolify.mjs servidores\n' +
      '  Ou fixe COOLIFY_PROJECT_UUID e COOLIFY_SERVER_UUID no .env',
    );
  }
  return {
    project_uuid: projeto,
    server_uuid: servidor,
    environment_name: flag('ambiente') || 'production',
  };
}

const [comando, ...args] = posicionais;

try {
  switch (comando) {
    case 'servidores': {
      const lista = await api('/servers');
      lista.forEach((s) => console.log(
        `  ${String(s.uuid).padEnd(28)} ${String(s.name).padEnd(22)} ${s.ip || ''}`,
      ));
      break;
    }

    case 'projetos': {
      const lista = await api('/projects');
      lista.forEach((p) => console.log(`  ${String(p.uuid).padEnd(28)} ${p.name}`));
      break;
    }

    case 'criar-projeto': {
      const [nome] = args;
      if (!nome) throw new Error('Uso: criar-projeto <nome>');
      const r = await api('/projects', { method: 'POST', body: { name: nome } });
      console.log(`  ✔ projeto "${nome}" criado — uuid ${r.uuid}`);
      break;
    }

    case 'recursos': {
      const lista = await api('/resources');
      lista.forEach((r) => console.log(
        `  ${String(r.uuid).padEnd(28)} ${String(r.type || '').padEnd(14)} ${String(r.name).padEnd(26)} ${r.status || ''}`,
      ));
      break;
    }

    case 'stack': {
      const [arquivo, nome] = args;
      if (!arquivo || !nome) throw new Error('Uso: stack <arquivo.yml> <nome> --projeto <uuid> --servidor <uuid>');
      if (!fs.existsSync(arquivo)) throw new Error(`Arquivo não encontrado: ${arquivo}`);

      const corpo = {
        ...contexto(),
        name: nome,
        docker_compose_raw: fs.readFileSync(arquivo, 'utf8'),
        instant_deploy: tem('deploy'),
      };
      const dominio = flag('dominio');
      if (dominio) corpo.urls = [dominio];

      const r = await api('/services', { method: 'POST', body: corpo });
      console.log(`  ✔ stack "${nome}" criada — uuid ${r.uuid}`);
      if (dominio) console.log(`    domínio: ${dominio}`);
      console.log(tem('deploy')
        ? '    deploy disparado'
        : `    para subir: node coolify.mjs deploy ${r.uuid}`);
      break;
    }

    case 'postgres': {
      const [nome] = args;
      if (!nome) throw new Error('Uso: postgres <nome> --projeto <uuid> --servidor <uuid>');
      const senha = flag('senha') || 'pg_' + Math.random().toString(36).slice(2, 14);
      const r = await api('/databases/postgresql', {
        method: 'POST',
        body: {
          ...contexto(),
          name: nome,
          postgres_user: flag('usuario') || 'postgres',
          postgres_password: senha,
          postgres_db: flag('banco') || nome.replace(/[^a-z0-9_]/gi, '_'),
          instant_deploy: tem('deploy'),
        },
      });
      console.log(`  ✔ Postgres "${nome}" criado — uuid ${r.uuid}`);
      console.log(`    senha: ${senha}   ← guarde agora, não é exibida de novo`);
      console.log('    conecte pelo nome interno do serviço, nunca pela porta pública');
      break;
    }

    case 'env': {
      const [uuid, ...pares] = args;
      if (!uuid || !pares.length) throw new Error('Uso: env <uuid> CHAVE=valor [CHAVE2=valor2] [--app]');
      // serviço por padrão; --app para aplicação
      const recurso = tem('app') ? 'applications' : 'services';
      for (const par of pares) {
        const i = par.indexOf('=');
        if (i < 0) throw new Error(`Formato inválido: "${par}". Use CHAVE=valor`);
        const key = par.slice(0, i);
        const value = par.slice(i + 1);
        await api(`/${recurso}/${uuid}/envs`, { method: 'POST', body: { key, value } });
        console.log(`  ✔ ${key} definida`);
      }
      console.log('    variáveis só valem no próximo deploy');
      break;
    }

    case 'deploy': {
      const [uuid] = args;
      if (!uuid) throw new Error('Uso: deploy <uuid> [--force]');
      const q = new URLSearchParams({ uuid });
      if (tem('force')) q.set('force', 'true');
      const r = await api(`/deploy?${q}`, { method: 'POST' });
      const dep = r.deployments?.[0];
      console.log('  ✔ deploy disparado');
      if (dep) {
        console.log(`    deployment: ${dep.deployment_uuid}`);
        console.log(`    acompanhe: node coolify.mjs status ${dep.deployment_uuid}`);
      }
      break;
    }

    case 'status': {
      const [uuid] = args;
      if (!uuid) throw new Error('Uso: status <uuid-do-deployment>');
      const d = await api(`/deployments/${uuid}`);
      console.log(`  status: ${d.status}`);
      console.log(`  app:    ${d.application_name || d.application_id || '-'}`);
      if (d.logs) {
        const linhas = String(d.logs).split('\n').filter(Boolean).slice(-15);
        console.log('  últimas linhas do log:');
        linhas.forEach((l) => console.log(`    ${l.slice(0, 160)}`));
      }
      break;
    }

    case 'logs': {
      const [uuid] = args;
      if (!uuid) throw new Error('Uso: logs <uuid>');
      const recurso = tem('app') ? 'applications' : 'services';
      const r = await api(`/${recurso}/${uuid}/logs?lines=100`);
      console.log(typeof r === 'string' ? r : (r.logs || JSON.stringify(r).slice(0, 4000)));
      break;
    }

    default:
      console.log(`Comandos:
  servidores                        lista servidores (pegue o uuid aqui)
  projetos                          lista projetos
  criar-projeto <nome>
  recursos                          tudo que está rodando, com status
  stack <arquivo.yml> <nome>        sobe um docker-compose como serviço
  postgres <nome>                   cria um Postgres gerenciado
  env <uuid> CHAVE=valor            define variáveis (--app se for aplicação)
  deploy <uuid> [--force]
  status <uuid-do-deployment>
  logs <uuid>

Flags de contexto: --projeto <uuid> --servidor <uuid> [--ambiente production]
                   --dominio https://sub.dominio.com.br  --deploy`);
  }
} catch (err) {
  console.error(`Erro: ${err.message}`);
  process.exitCode = 1;
}
