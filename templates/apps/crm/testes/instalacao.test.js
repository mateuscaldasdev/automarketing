import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoDaInstalacao, avisoDePooler } from '../lib/servidor/instalacao.js';

test('sem nenhuma variável, é modo demonstração', () => {
  assert.equal(estadoDaInstalacao({}), 'demo');
});

test('com Supabase mas sem DATABASE_URL, não consegue migrar', () => {
  assert.equal(estadoDaInstalacao({
    NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  }), 'sem-conexao');
});

test('com tudo preenchido, está pronto para migrar', () => {
  assert.equal(estadoDaInstalacao({
    NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    DATABASE_URL: 'postgresql://u:s@host:5432/postgres',
  }), 'pronto');
});

test('avisa quando a conexão usa o pooler de transação', () => {
  assert.match(avisoDePooler('postgresql://u:s@host:6543/postgres'), /6543/);
});

test('não avisa nada na porta de sessão', () => {
  assert.equal(avisoDePooler('postgresql://u:s@host:5432/postgres'), '');
});
