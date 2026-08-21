import { test } from 'node:test';
import assert from 'node:assert/strict';
import { papeisQuePossoDefinir } from '../lib/dominio.js';

test('super admin pode definir qualquer papel', () => {
  assert.deepEqual(papeisQuePossoDefinir('super_admin'), ['super_admin', 'admin', 'usuario']);
});

test('admin não pode criar outro super admin', () => {
  assert.deepEqual(papeisQuePossoDefinir('admin'), ['admin', 'usuario']);
});

test('usuário comum não define papel nenhum', () => {
  assert.deepEqual(papeisQuePossoDefinir('usuario'), []);
});

test('papel desconhecido não define nada', () => {
  assert.deepEqual(papeisQuePossoDefinir('chefe'), []);
});
