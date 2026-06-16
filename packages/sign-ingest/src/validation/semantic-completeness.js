'use strict';

// Semantic-completeness gate (canon plan Phase 4c).
//
// The block-order/@vocab validator proves the SIGN is well-FORMED; it does not prove the SIGN
// carries the full reasoning context the prose implies. This gate inspects the DROPPED source
// spans (prose that did not make it into any SIGN block) for high-signal content — normative
// rules, relationships, definitions — that a faithful encoding should have captured. A dropped
// "must/shall/required" clause or a "depends on/supersedes" relationship is a likely semantic
// gap: the encoding lost reasoning the prose asserts.
//
// Non-lossiness is the contract (markdown and SIGN are co-equal encodings of one meaning), so the
// canon-author/publish path runs this in STRICT mode — a high-severity gap blocks the freeze.
// By default it is advisory (warnings only) to avoid churn on the frozen corpus.

const NORMATIVE = /\b(must not|may not|must|shall|required|prohibited|mandatory|forbidden|obligated)\b/i;
const RELATIONAL = /\b(depends on|requires|supersedes|superseded by|derived from|maps to|part of|composed of|consists of|relates to|references?|inherits from)\b/i;
const DEFINITIONAL = /(\bis defined as\b|\brefers to\b|\bdenotes\b|\bmeans\b|:\s)/i;

function classify(text) {
  if (NORMATIVE.test(text)) return { kind: 'rule-or-constraint', severity: 'high' };
  if (RELATIONAL.test(text)) return { kind: 'relationship', severity: 'high' };
  if (DEFINITIONAL.test(text)) return { kind: 'definition', severity: 'medium' };
  return null;
}

function spanIdSet(blocks) {
  const ids = new Set();
  for (const block of blocks || []) {
    for (const span of block.spans || []) {
      if (span && span.id) ids.add(span.id);
    }
  }
  return ids;
}

// dropReport: output of makeDropReport; provReport: output of makeProvenanceReport.
function checkSemanticCompleteness({ dropReport, provReport, options = {} }) {
  const minGapChars = Number.isFinite(options.minGapChars) ? options.minGapChars : 24;
  const dropItems = (dropReport && dropReport.items) || [];

  const gaps = [];
  for (const item of dropItems) {
    const text = ((item.span && item.span.text) || '').trim();
    if (text.length < minGapChars) continue;
    const cls = classify(text);
    if (!cls) continue;
    gaps.push({
      kind: cls.kind,
      severity: cls.severity,
      reason: `Dropped prose implies a ${cls.kind} not present in the SIGN encoding.`,
      span: item.span,
      excerpt: text.length > 160 ? `${text.slice(0, 157)}...` : text,
    });
  }

  // coverage = used spans / (used ∪ dropped) — what fraction of recognized source spans the SIGN keeps.
  const used = spanIdSet(provReport && provReport.blocks);
  const droppedIds = new Set();
  for (const item of dropItems) if (item.span && item.span.id) droppedIds.add(item.span.id);
  let droppedOnly = 0;
  for (const id of droppedIds) if (!used.has(id)) droppedOnly += 1;
  const total = used.size + droppedOnly;
  const coverage = total === 0 ? 1 : Number((used.size / total).toFixed(4));

  const highGaps = gaps.filter(g => g.severity === 'high');
  return {
    ok: highGaps.length === 0,
    coverage,
    gapCount: gaps.length,
    highGapCount: highGaps.length,
    gaps,
  };
}

module.exports = { checkSemanticCompleteness };
