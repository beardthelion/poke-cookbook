import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, truncate, isPlaceholderAuthor, catClass } from './recipes.mjs';

test('escapeHtml neutralizes HTML-significant chars', () => {
  assert.equal(escapeHtml(`<b>"x" & 'y'</b>`), '&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('truncate keeps short strings, cuts long ones at a word boundary with ellipsis', () => {
  assert.equal(truncate('short text', 160), 'short text');
  const long = 'word '.repeat(60).trim(); // 299 chars
  const out = truncate(long, 160);
  assert.ok(out.length <= 161, 'within limit + ellipsis');
  assert.ok(out.endsWith('…'));
  assert.ok(!out.includes('  '));
});

test('isPlaceholderAuthor flags empty + Poke Team + Community (case-insensitive)', () => {
  assert.equal(isPlaceholderAuthor(''), true);
  assert.equal(isPlaceholderAuthor(null), true);
  assert.equal(isPlaceholderAuthor('Poke Team'), true);
  assert.equal(isPlaceholderAuthor('community'), true);
  assert.equal(isPlaceholderAuthor('amit'), false);
});

test('catClass maps known categories and falls back to cat-other', () => {
  assert.equal(catClass('Sports'), 'cat-sports');
  assert.equal(catClass('Real Estate'), 'cat-realestate');
  assert.equal(catClass('Nonexistent'), 'cat-other');
});
