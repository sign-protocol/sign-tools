'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { importOkf, writeImport } = require('../src');
const { validateSign } = require('../src/validator-bridge/validator');

const BUNDLE_DIR = path.join(__dirname, 'fixtures', 'okf', 'finance-okf');

function run(opts = {}) {
  return importOkf(BUNDLE_DIR, { bundle: 'finance-okf', ...opts });
}

test('imports concept files and skips index.md / log.md', () => {
  const result = run({ allowTypemapFallback: true });
  assert.equal(result.report.concepts_in, 3, 'three concepts (index.md + log.md skipped)');
  assert.equal(result.report.skeletons_out, 3);
  const ids = result.skeletons.map(s => s.docId).sort();
  assert.deepEqual(ids, [
    'prov:finance-okf.concepts-metrics-mrr',
    'prov:finance-okf.dashboards-exec',
    'prov:finance-okf.sources-ledger',
  ]);
});

test('skeletons carry landing status, provisional anchor, and xwalk provenance', () => {
  const mrr = run({ allowTypemapFallback: true }).skeletons
    .find(s => s.docId === 'prov:finance-okf.concepts-metrics-mrr').signText;
  // metric -> std via the default type-map; status is the dedicated `imported` token; v0.
  assert.match(mrr, /^@doc prov:finance-okf\.concepts-metrics-mrr \[std, imported, agents\] v0/);
  assert.match(mrr, /@anchor \[okf:v0\.1, src:finance-okf\]/);
  assert.match(mrr, /\+ concepts\/metrics\/mrr\.md/);
  assert.match(mrr, /@reviewed 2026-03-01/);
  assert.match(mrr, /@xwalk/);
  assert.match(mrr, /okf:concepts\/metrics\/mrr\.md => prov:finance-okf\.concepts-metrics-mrr \[method:okf-import, type:asserted\]/);
  assert.match(mrr, /# TODO\(sign-draft\)/);
  // Stage 1 invents no governance — no governance blocks (col-0 sigils) are emitted.
  assert.doesNotMatch(mrr, /^@(constraints|infer|cluster|boundary)\b/m);
});

test('resolves intra-bundle links and reports unresolved ones', () => {
  const result = run({ allowTypemapFallback: true });
  // mrr links to ledger (resolved) and to a missing source (unresolved).
  const mrr = result.skeletons.find(s => s.docId.endsWith('mrr')).signText;
  assert.match(mrr, /@links prov:finance-okf\.sources-ledger/);
  assert.equal(result.report.links.resolved >= 2, true); // mrr->ledger and exec->mrr
  assert.deepEqual(result.report.unresolved_links, [
    { from: 'concepts/metrics/mrr.md', href: '../sources/does-not-exist.md' },
  ]);
});

test('unmapped type falls back to ref, records a miss, and fails without --allow-typemap-fallback', () => {
  const strict = run();
  assert.equal(strict.ok, false, 'dashboard type is unmapped -> run not ok');
  assert.deepEqual(strict.report.typemap_misses, [{ type: 'dashboard', fell_back_to: 'ref', count: 1 }]);
  const exec = strict.skeletons.find(s => s.docId.endsWith('exec')).signText;
  assert.match(exec, /^@doc prov:finance-okf\.dashboards-exec \[ref, imported, agents\]/);

  const lenient = run({ allowTypemapFallback: true });
  assert.equal(lenient.ok, true);
});

test('a corpus typemap override maps the dashboard type', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-typemap-'));
  const typemapPath = path.join(tmp, 'okf.typemap.json');
  fs.writeFileSync(typemapPath, JSON.stringify({ dashboard: 'ref' }), 'utf8');
  const result = run({ typemapPath });
  assert.equal(result.ok, true, 'override removes the miss');
  assert.deepEqual(result.report.typemap_misses, []);
});

test('import is deterministic', () => {
  const a = run({ allowTypemapFallback: true });
  const b = run({ allowTypemapFallback: true });
  assert.equal(JSON.stringify(a.report), JSON.stringify(b.report));
  assert.deepEqual(a.skeletons.map(s => s.signText), b.skeletons.map(s => s.signText));
});

test('emitted skeletons validate as well-formed SIGN', async () => {
  const result = run({ allowTypemapFallback: true });
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okf-out-'));
  writeImport(result, outDir);
  const validation = await validateSign(outDir);
  if (validation.validator) {
    assert.equal(validation.ok, true, `validator errors:\n${(validation.errors || []).join('\n')}`);
  } else {
    // Validator binary not discoverable in this environment — skip rather than false-fail.
    assert.ok(true, 'SIGN validator unavailable; skeleton well-formedness not checked here');
  }
});
