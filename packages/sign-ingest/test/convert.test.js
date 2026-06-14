'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { convertDocument, doctor } = require('../src');

const FIXTURES = path.join(__dirname, 'fixtures');

test('convert emits SIGN, drop report, and provenance report', async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-ingest-test-'));
  const result = await convertDocument(path.join(FIXTURES, 'standard.md'), {
    doctype: 'standard',
    out: outDir,
  });

  assert.equal(result.ok, true, result.validation.errors.join('\n'));
  assert.ok(fs.existsSync(result.signPath), 'SIGN output exists');
  assert.ok(fs.existsSync(result.dropPath), 'drop report exists');
  assert.ok(fs.existsSync(result.provPath), 'provenance report exists');

  const sign = fs.readFileSync(result.signPath, 'utf8');
  assert.match(sign, /^@doc WFI-008 \[std, draft, agents\+employees\] v1 sha:/);
  assert.match(sign, /@def skill-definition-standard/);
  assert.match(sign, /@props/);
  assert.match(sign, /@rules/);
  assert.match(sign, /@attrs required/);

  const drops = JSON.parse(fs.readFileSync(result.dropPath, 'utf8'));
  assert.equal(drops.document.id, 'WFI-008');
  assert.ok(Array.isArray(drops.items));

  const provenance = JSON.parse(fs.readFileSync(result.provPath, 'utf8'));
  assert.ok(provenance.blocks.length > 0);
});

test('convert is deterministic for identical input and options', async () => {
  const outA = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-ingest-a-'));
  const outB = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-ingest-b-'));
  const input = path.join(FIXTURES, 'standard.md');

  const a = await convertDocument(input, { doctype: 'standard', out: outA });
  const b = await convertDocument(input, { doctype: 'standard', out: outB });

  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(fs.readFileSync(a.signPath, 'utf8'), fs.readFileSync(b.signPath, 'utf8'));
});

test('governed ontology allows declared predicates in relationships', async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-ingest-rel-'));
  const result = await convertDocument(path.join(FIXTURES, 'reference.md'), {
    doctype: 'reference',
    out: outDir,
    ontologyPath: path.join(FIXTURES, 'ontology.yaml'),
  });

  assert.equal(result.ok, true, result.validation.errors.join('\n'));
  const sign = fs.readFileSync(result.signPath, 'utf8');
  assert.match(sign, /@vocab/);
  assert.match(sign, /depends_on/);
  assert.match(sign, /@edges customer:data-analysis/);
  assert.match(sign, /\[conf:medium, status:proposed, type:inferred, src:reference.md#L/);
});

test('doctor reruns validation and reads the drop report', async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-ingest-doctor-'));
  const converted = await convertDocument(path.join(FIXTURES, 'standard.md'), {
    doctype: 'standard',
    out: outDir,
  });
  const result = await doctor(converted.signPath);

  assert.equal(result.validation.ok, true);
  assert.ok(result.dropReport);
  assert.equal(result.dropReport.document.id, 'WFI-008');
});

