/**
 * Garante que o destaque por palavra não altera o texto do comentário.
 *
 * Motivo: uma participante viu o próprio comentário aparecer duplicado na tela
 * de resultado, com um trecho repetido ao final. Este teste verifica que a
 * tokenização é uma partição exata do texto — nada some, nada se repete.
 */

import { tokenizeAndScore, temAtribuicoes } from './wordHighlight';

const COMENTARIO =
  'Foi uma ótima aula, repleta de sentimentos geográficos e simultâneos ' +
  'sobre a nova onda do imperador romano.';

test('os tokens remontam exatamente o texto original', () => {
  const atribuicoes = { foi: 0.4, aula: 0.8, ótima: 0.9, nova: -0.2 };
  const tokens = tokenizeAndScore(COMENTARIO, atribuicoes);

  expect(tokens.map((t) => t.token).join('')).toBe(COMENTARIO);
});

test('sem atribuições o texto também permanece íntegro', () => {
  const tokens = tokenizeAndScore(COMENTARIO, null);
  expect(tokens.map((t) => t.token).join('')).toBe(COMENTARIO);
  expect(tokens.every((t) => t.style === null)).toBe(true);
});

test('atribuições extras que não estão no texto não acrescentam tokens', () => {
  const atribuicoes = { inexistente: 0.9, outra: -0.7, aula: 0.5 };
  const tokens = tokenizeAndScore(COMENTARIO, atribuicoes);

  expect(tokens.map((t) => t.token).join('')).toBe(COMENTARIO);
  expect(tokens.some((t) => t.token === 'inexistente')).toBe(false);
});

test('só palavras com atribuição recebem estilo', () => {
  const tokens = tokenizeAndScore(COMENTARIO, { aula: 0.8 });
  const comEstilo = tokens.filter((t) => t.style !== null).map((t) => t.token);
  expect(comEstilo).toEqual(['aula']);
});

test('temAtribuicoes distingue ausência de dicionário vazio', () => {
  expect(temAtribuicoes(null)).toBe(false);
  expect(temAtribuicoes({})).toBe(false);
  expect(temAtribuicoes({ aula: 0.5 })).toBe(true);
});
