import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saldoApos, abaixoDoMinimo } from '../lib/estoque.js';

test('entrada soma ao saldo', () => {
  assert.equal(saldoApos(10, { tipo: 'entrada', quantidade: 5 }), 15);
});

test('saída subtrai do saldo', () => {
  assert.equal(saldoApos(10, { tipo: 'saida', quantidade: 4 }), 6);
});

test('ajuste define o saldo absoluto', () => {
  assert.equal(saldoApos(10, { tipo: 'ajuste', quantidade: 3 }), 3);
});

test('ajuste aceita zerar o estoque', () => {
  assert.equal(saldoApos(10, { tipo: 'ajuste', quantidade: 0 }), 0);
});

test('saída pode deixar o saldo negativo — lançamento retroativo é real', () => {
  assert.equal(saldoApos(2, { tipo: 'saida', quantidade: 5 }), -3);
});

test('recusa quantidade zero em entrada', () => {
  assert.throws(() => saldoApos(1, { tipo: 'entrada', quantidade: 0 }), /maior que zero/);
});

test('recusa quantidade negativa', () => {
  assert.throws(() => saldoApos(1, { tipo: 'entrada', quantidade: -2 }), /maior que zero/);
});

test('recusa ajuste negativo', () => {
  assert.throws(() => saldoApos(1, { tipo: 'ajuste', quantidade: -1 }), /negativo/);
});

test('recusa tipo desconhecido', () => {
  assert.throws(() => saldoApos(1, { tipo: 'roubo', quantidade: 1 }), /inválido/);
});

test('acusa quando o saldo fica abaixo do mínimo', () => {
  assert.equal(abaixoDoMinimo({ saldo: 3, minimo: 5 }), true);
});

test('saldo igual ao mínimo ainda não é alerta', () => {
  assert.equal(abaixoDoMinimo({ saldo: 5, minimo: 5 }), false);
});

test('mínimo zero nunca alerta, nem com saldo zero', () => {
  assert.equal(abaixoDoMinimo({ saldo: 0, minimo: 0 }), false);
});
