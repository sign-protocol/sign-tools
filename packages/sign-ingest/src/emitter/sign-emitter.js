'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { predicateDefinition } = require('../ontology/load');
const { indentBlock, normalizeInline, normalizeToken, uniqueBy } = require('../utils/text');
const { sourceRef, spanToReport } = require('../handlers/registry');

function emitSign(ir, options = {}) {
  const provenance = [];
  const bodyLines = [];

  if (ir.metadata.summary) {
    bodyLines.push(`## ${ir.metadata.summary}`);
  }

  const vocab = collectVocab(ir, options.ontology);
  if (vocab.length) {
    addBlock(bodyLines, provenance, '@vocab', vocab.map(item => `  ${padPredicate(item.predicate)} | ${item.definition}`), itemSpans(vocab));
  }

  if (ir.definition) {
    addBlock(bodyLines, provenance, `@def ${ir.definition.name || normalizeToken(ir.metadata.title)}`, wrapText(ir.definition.text), ir.definition.spans);
  }

  addListBlock(bodyLines, provenance, '@props', ir.props, item => `  + ${padName(item.name)} | ${item.text}`);
  addListBlock(bodyLines, provenance, '@include', ir.include, item => `  ? ${item.text}`);
  addListBlock(bodyLines, provenance, '@exclude', ir.exclude, item => `  ! ${item.text}`);
  addListBlock(bodyLines, provenance, '@rules', ir.rules, (item, index) => `  ${index + 1}. ${item.text}`);
  addListBlock(bodyLines, provenance, '@boundary', ir.boundary, item => `  ${item.text}`);
  addListBlock(bodyLines, provenance, '@constraints', ir.constraints, item => `  ${item.text}`);
  addInferBlocks(bodyLines, provenance, ir);
  addRelBlock(bodyLines, provenance, ir.rel);
  addEdgeBlocks(bodyLines, provenance, ir.edges);
  addXwalkBlock(bodyLines, provenance, ir.xwalk);
  addAttrsBlock(bodyLines, provenance, '@attrs required', ir.attrs.required);
  addAttrsBlock(bodyLines, provenance, '@attrs optional', ir.attrs.optional);
  addListBlock(bodyLines, provenance, '@phases', ir.phases, item => `  ${item.extra.status || '[later]'} ${item.name}: ${item.text}`);
  addListBlock(bodyLines, provenance, '@status', ir.status, item => `  ${item.name}: ${item.text}`);

  const headerWithoutHash = `@doc ${ir.metadata.id} [${ir.metadata.signType}, ${ir.metadata.status}, ${ir.metadata.audiences}] ${ir.metadata.version}`;
  const hashInput = `${headerWithoutHash}\n${bodyLines.join('\n')}\n`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 7);
  const signText = `${headerWithoutHash} sha:${hash}\n${bodyLines.join('\n')}\n`;

  return {
    signText,
    provenance: provenance.map((entry, index) => ({
      id: `prov-${String(index + 1).padStart(4, '0')}`,
      ...entry,
      spans: (entry.spans || []).map(spanToReport),
    })),
    manifest: {
      ...ir.manifest,
      id: ir.metadata.id,
      doctype: ir.metadata.doctype,
      signType: ir.metadata.signType,
      hash,
      emitter: 'sign-ingest deterministic emitter v0.1.0',
    },
  };
}

function collectVocab(ir, ontology) {
  const used = new Map();
  for (const item of ir.vocab || []) {
    used.set(item.predicate, {
      predicate: item.predicate,
      definition: item.definition || predicateDefinition(ontology, item.predicate),
      spans: item.spans || [],
    });
  }
  for (const rel of ir.rel || []) {
    if (rel.extra.direction === '<-') continue;
    used.set(rel.name, {
      predicate: rel.name,
      definition: predicateDefinition(ontology, rel.name),
      spans: rel.spans || [],
    });
  }
  for (const edge of ir.edges || []) {
    used.set(edge.name, {
      predicate: edge.name,
      definition: predicateDefinition(ontology, edge.name),
      spans: edge.spans || [],
    });
  }
  return [...used.values()].sort((a, b) => a.predicate.localeCompare(b.predicate));
}

function addBlock(lines, provenance, header, contentLines, spans = []) {
  lines.push('');
  lines.push(header);
  lines.push(...contentLines);
  provenance.push({ sigil: header.split(/\s+/)[0], label: header, spans });
}

function addListBlock(lines, provenance, header, items, format) {
  if (!items || items.length === 0) return;
  const blockLines = [];
  items.forEach((item, index) => {
    blockLines.push(format(item, index));
    provenance.push({ sigil: header.split(/\s+/)[0], label: `${header}:${index + 1}`, spans: item.spans || [] });
  });
  lines.push('');
  lines.push(header);
  lines.push(...blockLines);
}

function addInferBlocks(lines, provenance, ir) {
  for (const item of ir.infer || []) {
    lines.push('');
    lines.push(`@infer ${item.name}`);
    lines.push(`  applies-to: ${item.extra.appliesTo || ir.metadata.signType}`);
    lines.push(`  when: ${item.extra.when}`);
    for (const condition of item.extra.and || []) {
      lines.push(`  and: ${condition}`);
    }
    lines.push(`  then: ${item.extra.then}`);
    lines.push(`  confidence: ${item.extra.confidence || 'medium'}`);
    lines.push(`  src: ${item.extra.src || fallbackSource(item)}`);
    provenance.push({ sigil: '@infer', label: item.name, spans: item.spans || [] });
  }
}

function addRelBlock(lines, provenance, rels) {
  if (!rels || rels.length === 0) return;
  const deduped = uniqueBy(rels, item => `${item.name}:${item.extra.direction}:${item.text}`);
  lines.push('');
  lines.push('@rel');
  for (const item of deduped) {
    const props = propertyBag(item.extra.properties || {});
    const target = item.text || 'Reference';
    lines.push(`  ${padPredicate(item.name)} ${item.extra.direction || '->'} ${target}${props ? ` ${props}` : ''}`);
    provenance.push({ sigil: '@rel', label: item.name, spans: item.spans || [] });
  }
}

function addEdgeBlocks(lines, provenance, edges) {
  if (!edges || edges.length === 0) return;
  const groups = new Map();
  for (const edge of edges) {
    const scope = edge.extra.scope || edge.extra.subject;
    if (!groups.has(scope)) groups.set(scope, []);
    groups.get(scope).push(edge);
  }

  for (const [scope, group] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push('');
    lines.push(`@edges ${scope}`);
    for (const edge of group) {
      const props = {
        conf: capConfidence(edge.extra.properties?.conf || edge.confidence, edge.extractionMethod),
        status: edge.extra.properties?.status || defaultStatus(edge),
        type: edge.extra.properties?.type || defaultType(edge),
        src: edge.extra.properties?.src || fallbackSource(edge),
        ...(edge.extra.properties || {}),
      };
      props.conf = capConfidence(props.conf, props.type === 'inferred' ? 'inferred' : edge.extractionMethod);
      const bag = propertyBag(props);
      lines.push(`  ${edge.extra.subject} ${edge.name} ${edge.extra.target}${bag ? ` ${bag}` : ''}`);
      provenance.push({ sigil: '@edges', label: `${edge.extra.subject} ${edge.name} ${edge.extra.target}`, spans: edge.spans || [] });
    }
  }
}

function addXwalkBlock(lines, provenance, xwalk) {
  if (!xwalk || xwalk.length === 0) return;
  lines.push('');
  lines.push('@xwalk');
  for (const item of xwalk) {
    const props = propertyBag(item.extra.properties || {});
    lines.push(`  ${item.extra.source} => ${item.extra.target}${props ? ` ${props}` : ''}`);
    provenance.push({ sigil: '@xwalk', label: `${item.extra.source}=>${item.extra.target}`, spans: item.spans || [] });
  }
}

function addAttrsBlock(lines, provenance, header, attrs) {
  if (!attrs || attrs.length === 0) return;
  lines.push('');
  lines.push(header);
  for (const item of attrs) {
    lines.push(`  ${padName(item.name)} | ${item.text}`);
    provenance.push({ sigil: '@attrs', label: `${header}:${item.name}`, spans: item.spans || [] });
  }
}

function wrapText(text) {
  return indentBlock(normalizeInline(text)).split('\n');
}

function propertyBag(props) {
  const entries = Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => propertyRank(a) - propertyRank(b) || a.localeCompare(b))
    .map(([key, value]) => `${key}:${sanitizePropertyValue(value)}`);
  return entries.length ? `[${entries.join(', ')}]` : '';
}

function propertyRank(key) {
  const order = ['str', 'conf', 'status', 'type', 'src', 'rule', 'provenance', 'weight', 'prof'];
  const index = order.indexOf(key);
  return index === -1 ? order.length : index;
}

function sanitizePropertyValue(value) {
  return String(value).trim().replace(/\s+/g, '-').replace(/,/g, ';');
}

function capConfidence(confidence, extractionMethod) {
  if (extractionMethod === 'inferred' && confidence === 'high') return 'medium';
  return confidence || 'medium';
}

function defaultStatus(edge) {
  return edge.extractionMethod === 'direct' ? 'validated' : 'proposed';
}

function defaultType(edge) {
  return edge.extractionMethod === 'direct' ? 'asserted' : 'inferred';
}

function fallbackSource(item) {
  const span = item.spans && item.spans[0];
  if (!span) return 'sign-ingest';
  return sourceRef(span, span.file ? path.basename(span.file) : 'source');
}

function itemSpans(items) {
  return items.flatMap(item => item.spans || []);
}

function padPredicate(predicate) {
  return String(predicate).padEnd(14, ' ');
}

function padName(name) {
  return String(name || 'item').padEnd(22, ' ');
}

module.exports = { emitSign };

