import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendentes } from '../lib/servidor/migracoes.js';

test('devolve todas as migrações quando nenhuma foi aplicada', () => {
  const r = pendentes(['001_base.sql', '002_estoque.sql'], []);
  assert.deepEqual(r, ['001_base.sql', '002_estoque.sql']);
});

test('exclui as que já foram aplicadas', () => {
  const r = pendentes(['001_base.sql', '002_estoque.sql'], ['001_base.sql']);
  assert.deepEqual(r, ['002_estoque.sql']);
});

test('devolve vazio quando tudo já foi aplicado', () => {
  const r = pendentes(['001_base.sql'], ['001_base.sql']);
  assert.deepEqual(r, []);
});

test('ordena pelo número, não pela ordem do sistema de arquivos', () => {
  const r = pendentes(['010_dez.sql', '002_dois.sql', '001_um.sql'], []);
  assert.deepEqual(r, ['001_um.sql', '002_dois.sql', '010_dez.sql']);
});

test('ignora arquivo que não segue o padrão NNN_nome.sql', () => {
  const r = pendentes(['001_base.sql', 'rascunho.sql', 'README.md', '02_curto.sql'], []);
  assert.deepEqual(r, ['001_base.sql']);
});

import { aplicarMigracoes } from '../lib/servidor/migracoes.js';

/** Cliente falso: grava tudo que recebeu, para o teste conferir a ordem. */
function clienteFalso({ jaAplicadas = [], falharEm = null } = {}) {
  const chamadas = [];
  return {
    chamadas,
    async query(sql) {
      chamadas.push(sql);
      if (falharEm && sql.includes(falharEm)) throw new Error('erro proposital');
      if (sql.includes('select nome from public.schema_versao')) {
        return { rows: jaAplicadas.map((nome) => ({ nome })) };
      }
      return { rows: [] };
    },
  };
}

test('cria schema_versao antes de qualquer migração', async () => {
  const c = clienteFalso();
  await aplicarMigracoes(c, { arquivos: [], ler: () => '' });
  assert.ok(c.chamadas[0].includes('create table if not exists public.schema_versao'));
});

test('pega e solta o advisory lock', async () => {
  const c = clienteFalso();
  await aplicarMigracoes(c, { arquivos: [], ler: () => '' });
  assert.ok(c.chamadas.some((s) => s.includes('pg_advisory_lock')));
  assert.ok(c.chamadas.some((s) => s.includes('pg_advisory_unlock')));
});

test('roda cada migração dentro de uma transação e registra a versão', async () => {
  const c = clienteFalso();
  const r = await aplicarMigracoes(c, {
    arquivos: ['001_base.sql'],
    ler: () => 'create table exemplo (id int);',
  });
  assert.deepEqual(r.aplicadas, ['001_base.sql']);
  const i = c.chamadas.findIndex((s) => s === 'begin');
  assert.ok(i >= 0, 'abriu transação');
  assert.ok(c.chamadas.slice(i).some((s) => s.includes('create table exemplo')));
  assert.ok(c.chamadas.slice(i).some((s) => s.includes('insert into public.schema_versao')));
  assert.ok(c.chamadas.includes('commit'));
});

test('não reaplica migração já registrada', async () => {
  const c = clienteFalso({ jaAplicadas: ['001_base.sql'] });
  const r = await aplicarMigracoes(c, {
    arquivos: ['001_base.sql'],
    ler: () => 'create table exemplo (id int);',
  });
  assert.deepEqual(r.aplicadas, []);
  assert.ok(!c.chamadas.some((s) => s.includes('create table exemplo')));
});

test('faz rollback e solta o lock quando a migração falha', async () => {
  const c = clienteFalso({ falharEm: 'create table quebrada' });
  await assert.rejects(
    aplicarMigracoes(c, { arquivos: ['001_base.sql'], ler: () => 'create table quebrada;' }),
    /001_base\.sql/,
  );
  assert.ok(c.chamadas.includes('rollback'));
  assert.ok(c.chamadas.some((s) => s.includes('pg_advisory_unlock')));
});
