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

import { pageDocument } from './recipes.mjs';

test('pageDocument builds a valid doc with escaped, canonical meta', () => {
  const html = pageDocument({
    title: 'A <recipe> & "thing"',
    description: 'desc',
    canonical: 'https://pokecookbook.com/r/abc',
    ogType: 'article',
    body: '<main>hi</main>',
  });
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<title>A &lt;recipe&gt; &amp; &quot;thing&quot;</title>'));
  assert.ok(html.includes('<link rel="canonical" href="https://pokecookbook.com/r/abc">'));
  assert.ok(html.includes('<meta property="og:type" content="article">'));
  assert.ok(html.includes('<main>hi</main>'));
});

test('truncate hard-cuts a string with no spaces', () => {
  const noSpace = 'x'.repeat(200);
  const out = truncate(noSpace, 160);
  assert.ok(out.length <= 161);
  assert.ok(out.endsWith('…'));
});

import { safeProfileUrl } from './recipes.mjs';

test('safeProfileUrl allows poke.com /u/ links and rejects other schemes/hosts', () => {
  assert.equal(safeProfileUrl('https://poke.com/u/amit'), 'https://poke.com/u/amit');
  assert.equal(safeProfileUrl('http://www.poke.com/u/amit'), 'http://www.poke.com/u/amit');
  assert.equal(safeProfileUrl('javascript:alert(document.cookie)'), null);
  assert.equal(safeProfileUrl('https://evil.com/u/x'), null);
  assert.equal(safeProfileUrl('https://poke.com/r/abc'), null);
  assert.equal(safeProfileUrl(null), null);
  assert.equal(safeProfileUrl(''), null);
});
