#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const readUtf8 = (filePath) => fs.readFileSync(filePath, 'utf8');

const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const getProjectRoot = () => process.cwd();

const findAll = (text, regex) => {
  const results = [];
  let match;
  while ((match = regex.exec(text))) results.push(match);
  return results;
};

const root = getProjectRoot();
const indexPath = path.join(root, 'index.html');
const cssPath = path.join(root, 'assets', 'styles.css');
const jsPath = path.join(root, 'assets', 'app.js');
const faviconPath = path.join(root, 'assets', 'favicon.svg');

assert(fs.existsSync(indexPath), 'Missing file: index.html');
assert(fs.existsSync(cssPath), 'Missing file: assets/styles.css');
assert(fs.existsSync(jsPath), 'Missing file: assets/app.js');
assert(fs.existsSync(faviconPath), 'Missing file: assets/favicon.svg');

const html = readUtf8(indexPath);
const css = readUtf8(cssPath);
const js = readUtf8(jsPath);

// ---- HTML sanity ----
assert(/<html\b[^>]*\blang="[^"]+"/i.test(html), 'index.html: missing <html lang="...">');
assert(/<meta\b[^>]*name="viewport"/i.test(html), 'index.html: missing meta viewport');
assert(/<main\b[^>]*id="main"/i.test(html), 'index.html: missing <main id="main">');
assert(/<noscript>/i.test(html), 'index.html: missing <noscript> hint');

// Duplicate ids
{
  const ids = new Map();
  for (const m of findAll(html, /\bid\s*=\s*"([^"]+)"/g)) {
    const id = m[1];
    ids.set(id, (ids.get(id) || 0) + 1);
  }
  const dups = [...ids.entries()].filter(([, n]) => n > 1);
  assert(dups.length === 0, `index.html: duplicate ids found:\n${dups.map(([id, n]) => `- ${id}: ${n}`).join('\n')}`);
}

// target="_blank" must have rel noopener + noreferrer
{
  const blankLinks = findAll(html, /<a\b[^>]*\btarget="_blank"[^>]*>/gi).map((m) => m[0]);
  for (const tag of blankLinks) {
    const rel = (tag.match(/\brel="([^"]+)"/i) || [])[1] || '';
    const relTokens = new Set(rel.split(/\s+/).filter(Boolean).map((t) => t.toLowerCase()));
    assert(relTokens.has('noopener') && relTokens.has('noreferrer'), `index.html: target="_blank" missing rel="noopener noreferrer": ${tag}`);
  }
}

// Cache busting: require ?v=... for key assets and consistent version
{
  const refs = [
    { name: 'styles', pattern: /assets\/styles\.css\?v=([0-9A-Za-z-_.]+)/g },
    { name: 'app', pattern: /assets\/app\.js\?v=([0-9A-Za-z-_.]+)/g },
    { name: 'favicon', pattern: /assets\/favicon\.svg\?v=([0-9A-Za-z-_.]+)/g },
  ];

  const versions = new Map();
  for (const { name, pattern } of refs) {
    const matches = findAll(html, pattern);
    assert(matches.length >= 1, `index.html: missing cache-busting reference for ${name} (?v=...)`);
    versions.set(name, matches[0][1]);
  }

  const unique = new Set(versions.values());
  assert(unique.size === 1, `index.html: cache-busting versions are not consistent: ${JSON.stringify(Object.fromEntries(versions), null, 2)}`);
}

// Motion toggle must exist (feature contract)
assert(/\bdata-motion-toggle\b/i.test(html), 'index.html: missing motion toggle button [data-motion-toggle]');

// ---- JS sanity ----
assert(!/\balert\s*\(/.test(js), 'assets/app.js: do not use alert() in production UI');
assert(!/\bconsole\./.test(js), 'assets/app.js: do not leave console.* in production UI');
assert(!/\bdebugger\b/.test(js), 'assets/app.js: do not leave debugger statements');

// ---- CSS sanity ----
assert(css.includes('.skip-link'), 'assets/styles.css: missing .skip-link styles');
assert(css.includes('.toast-root'), 'assets/styles.css: missing Toast styles (.toast-root)');
assert(!/\bopacity\s*:\s*0\b/.test(css) || css.includes('默认可见'), 'assets/styles.css: avoid hard-coded opacity:0 for core content (ensure default-visible strategy)');

if (process.exitCode) {
  process.stderr.write('\n❌ Validation failed.\n');
  process.exit(process.exitCode);
}

process.stdout.write('✅ Validation OK\n');
