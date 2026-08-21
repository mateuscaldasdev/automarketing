import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarDono } from '../lib/servidor/instalacao.js';

test('aceita dados completos', () => {
  assert.deepEqual(validarDono({
    email: 'eu@empresa.com.br', senha: 'segredo123',
    nome: 'Mateus', organizacao: 'Automarketing',
  }), []);
});

test('exige e-mail com formato plausível', () => {
  assert.ok(validarDono({ email: 'nao-e-email', senha: 'segredo123', organizacao: 'X' })
    .some((e) => /e-mail/i.test(e)));
});

test('exige senha de pelo menos 8 caracteres', () => {
  assert.ok(validarDono({ email: 'eu@x.com', senha: 'curta', organizacao: 'X' })
    .some((e) => /8/.test(e)));
});

test('exige nome da organização', () => {
  assert.ok(validarDono({ email: 'eu@x.com', senha: 'segredo123', organizacao: '  ' })
    .some((e) => /organiza/i.test(e)));
});

test('junta todos os problemas de uma vez, não só o primeiro', () => {
  assert.equal(validarDono({ email: 'x', senha: 'y', organizacao: '' }).length, 3);
});
