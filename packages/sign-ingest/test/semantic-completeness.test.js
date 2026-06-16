'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { checkSemanticCompleteness } = require('../src/validation/semantic-completeness');

function drop(id, text, line = 1) {
  return { id: `drop-${id}`, reason: 'ambiguous', span: { id, file: 'x.md', startLine: line, endLine: line, text } };
}

function prov(...ids) {
  return { blocks: ids.map(id => ({ spans: [{ id }] })) };
}

test('flags dropped normative prose as a high-severity rule gap', () => {
  const dropReport = { items: [drop('S1', 'Members must complete the assessment before access is granted.')] };
  const r = checkSemanticCompleteness({ dropReport, provReport: prov('S2', 'S3') });

  assert.equal(r.highGapCount, 1);
  assert.equal(r.gaps[0].kind, 'rule-or-constraint');
  assert.equal(r.gaps[0].severity, 'high');
  assert.equal(r.ok, false);
});

test('flags dropped relationship prose as a high-severity relationship gap', () => {
  const dropReport = { items: [drop('S1', 'The eligibility rule depends on the tenure threshold defined elsewhere.')] };
  const r = checkSemanticCompleteness({ dropReport, provReport: prov('S2') });

  assert.equal(r.gaps[0].kind, 'relationship');
  assert.equal(r.ok, false);
});

test('ok when no high-signal prose was dropped', () => {
  const dropReport = { items: [drop('S1', 'This paragraph is descriptive background with no normative force at all.')] };
  const r = checkSemanticCompleteness({ dropReport, provReport: prov('S2', 'S3') });

  assert.equal(r.highGapCount, 0);
  assert.equal(r.ok, true);
});

test('ignores drops shorter than the minimum gap length', () => {
  const dropReport = { items: [drop('S1', 'must')] }; // under default 24 chars
  const r = checkSemanticCompleteness({ dropReport, provReport: prov('S2') });

  assert.equal(r.gapCount, 0);
  assert.equal(r.ok, true);
});

test('computes coverage as used / (used union dropped)', () => {
  // 3 used spans, 1 dropped span not among them → 3/4 = 0.75
  const dropReport = { items: [drop('D1', 'background prose that is plenty long enough to count here')] };
  const r = checkSemanticCompleteness({ dropReport, provReport: prov('U1', 'U2', 'U3') });

  assert.equal(r.coverage, 0.75);
});

test('full coverage when there are no spans at all', () => {
  const r = checkSemanticCompleteness({ dropReport: { items: [] }, provReport: { blocks: [] } });
  assert.equal(r.coverage, 1);
  assert.equal(r.ok, true);
});
