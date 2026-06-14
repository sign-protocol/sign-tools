'use strict';

const path = require('node:path');
const {
  docIdFromFile,
  firstSentence,
  normalizeInline,
  normalizeToken,
  slugify,
  splitNameDescription,
  stripMarkdown,
  uniqueBy,
} = require('../utils/text');
const { namespaceAllowed, predicateAllowed, predicateDefinition } = require('../ontology/load');

const DOCTYPE_TO_SIGN_TYPE = {
  policy: 'pol',
  standard: 'std',
  adr: 'adr',
  plan: 'pln',
  glossary: 'gls',
  reference: 'ref',
};

const REGISTERED_DOCTYPES = Object.keys(DOCTYPE_TO_SIGN_TYPE);

function inferDoctype(source, explicit) {
  if (explicit) return assertDoctype(explicit);
  const fm = source.frontMatter || {};
  const frontMatterType = fm.doctype || fm.documentType || fm.type;
  if (frontMatterType && DOCTYPE_TO_SIGN_TYPE[frontMatterType]) return frontMatterType;
  if (frontMatterType && Object.values(DOCTYPE_TO_SIGN_TYPE).includes(frontMatterType)) {
    return Object.entries(DOCTYPE_TO_SIGN_TYPE).find(([, signType]) => signType === frontMatterType)[0];
  }

  const name = path.basename(source.filePath).toLowerCase();
  for (const doctype of REGISTERED_DOCTYPES) {
    if (name.includes(doctype)) return doctype;
  }
  if (/\badr[-_\d]/.test(name) || name.startsWith('adr')) return 'adr';
  return null;
}

function assertDoctype(doctype) {
  if (!DOCTYPE_TO_SIGN_TYPE[doctype]) {
    const err = new Error(`Unsupported doctype "${doctype}". Registered doctypes: ${REGISTERED_DOCTYPES.join(', ')}`);
    err.code = 'UNSUPPORTED_DOCTYPE';
    throw err;
  }
  return doctype;
}

function extractIr(source, options = {}) {
  const doctype = inferDoctype(source, options.doctype);
  if (!doctype) {
    const err = new Error('--doctype is required because the document type could not be inferred from front matter or filename.');
    err.code = 'DOCTYPE_REQUIRED';
    throw err;
  }

  const ontology = options.ontology;
  const metadata = makeMetadata(source, doctype);
  const context = makeContext(source, metadata, ontology);
  const ir = makeEmptyIr(metadata, source, ontology);

  addDefinition(ir, context);
  addCommonBlocks(ir, context);

  switch (doctype) {
    case 'standard':
      addStandardBlocks(ir, context);
      break;
    case 'policy':
      addPolicyBlocks(ir, context);
      break;
    case 'adr':
      addAdrBlocks(ir, context);
      break;
    case 'plan':
      addPlanBlocks(ir, context);
      break;
    case 'glossary':
      addGlossaryBlocks(ir, context);
      break;
    case 'reference':
      addReferenceBlocks(ir, context);
      break;
    default:
      break;
  }

  addDetectedRelationships(ir, context, options);
  finalizeDrops(ir, context);
  return ir;
}

function makeMetadata(source, doctype) {
  const fm = source.frontMatter || {};
  const id = normalizeInline(fm.id || fm.docId || fm['doc-id'] || docIdFromFile(source.filePath));
  const status = normalizeInline(fm.status || 'draft');
  const audiences = normalizeInline(fm.audiences || fm.audience || 'agents');
  const version = normalizeInline(fm.version || 'v1').replace(/^v?/, 'v');
  const title = normalizeInline(fm.title || source.title);
  const signType = DOCTYPE_TO_SIGN_TYPE[doctype];
  return {
    id,
    title,
    doctype,
    signType,
    status,
    audiences,
    version,
    signSpec: '>=1.0,<2.0',
  };
}

function makeContext(source, metadata, ontology) {
  const contentSpans = source.spans.filter(span => span.normalized);
  const headings = source.sections.map(section => section.headingSpan).filter(Boolean);
  return {
    source,
    metadata,
    ontology,
    spans: contentSpans,
    headings,
    used: new Set(),
  };
}

function makeEmptyIr(metadata, source, ontology) {
  return {
    manifest: {
      name: 'sign-ingest',
      version: '0.1.0',
      signSpec: metadata.signSpec,
      ontologyMode: ontology.mode,
      sourcePath: source.filePath,
    },
    metadata,
    vocab: [],
    definition: null,
    props: [],
    include: [],
    exclude: [],
    rules: [],
    boundary: [],
    constraints: [],
    infer: [],
    rel: [],
    edges: [],
    xwalk: [],
    attrs: {
      required: [],
      optional: [],
    },
    phases: [],
    status: [],
    drops: [],
    warnings: [],
  };
}

function addDefinition(ir, context) {
  const fmDefinition = context.source.frontMatter.definition || context.source.frontMatter.summary;
  if (fmDefinition) {
    ir.definition = fact('definition', context.metadata.doctype === 'glossary' ? 'terms' : slugify(context.metadata.title), normalizeInline(fmDefinition), []);
    return;
  }

  const candidate = context.spans.find(span =>
    span.kind === 'paragraph'
    && !isUnderSection(context.source, span, /include|exclude|rule|constraint|attribute|property|phase|status|link|reference|glossary/i)
  );
  const fallback = context.spans.find(span => span.kind === 'paragraph');
  const span = candidate || fallback;
  if (!span) {
    ir.definition = fact('definition', slugify(context.metadata.title), context.metadata.title, []);
    return;
  }

  context.used.add(span.id);
  ir.definition = fact('definition', slugify(context.metadata.title), stripMarkdown(span.text), [span]);
  context.metadata.summary = firstSentence(`${context.metadata.title}. ${span.normalized}`, 180);
}

function addCommonBlocks(ir, context) {
  const sections = context.source.sections;

  for (const section of sectionsMatching(sections, /prop|field|core/i)) {
    for (const span of section.spans.filter(isListLike)) {
      const { name, description } = splitNameDescription(span.text);
      ir.props.push(fact('prop', name, description, [span]));
      context.used.add(span.id);
    }
  }

  for (const section of sectionsMatching(sections, /include|in scope|eligible|applies/i)) {
    addListFacts(ir.include, context, section.spans, 'include');
  }

  for (const section of sectionsMatching(sections, /exclude|out of scope|ineligible|disallow/i)) {
    addListFacts(ir.exclude, context, section.spans, 'exclude');
  }

  for (const section of sectionsMatching(sections, /boundary|scope/i)) {
    for (const span of section.spans.filter(span => span.kind === 'paragraph' || isListLike(span))) {
      ir.boundary.push(fact('boundary', null, stripMarkdown(span.text), [span]));
      context.used.add(span.id);
    }
  }

  for (const section of sectionsMatching(sections, /constraint|enforcement|guardrail/i)) {
    for (const span of section.spans.filter(span => span.kind !== 'heading')) {
      const text = stripMarkdown(span.text);
      if (!text) continue;
      ir.constraints.push(fact('constraint', null, normalizeConstraint(text), [span]));
      context.used.add(span.id);
    }
  }

  addAttributeFacts(ir, context);
  addRulesFromSections(ir, context);
}

function addStandardBlocks(ir, context) {
  if (!ir.props.length) {
    for (const span of context.spans.filter(span => isListLike(span)).slice(0, 8)) {
      const { name, description } = splitNameDescription(span.text);
      ir.props.push(fact('prop', name, description, [span]));
      context.used.add(span.id);
    }
  }
}

function addPolicyBlocks(ir, context) {
  addNormativeRules(ir, context, /must|shall|required|prohibited|forbidden|may not|should|approved|approval/i);
}

function addAdrBlocks(ir, context) {
  const statusSection = firstSectionMatching(context.source.sections, /status|decision|consequence|context/i);
  if (statusSection) {
    for (const span of statusSection.spans.filter(span => span.kind === 'key-value' || isListLike(span))) {
      const { name, description } = splitNameDescription(span.text);
      ir.status.push(fact('status', name, description || 'captured from ADR', [span]));
      context.used.add(span.id);
    }
  }
  addNormativeRules(ir, context, /decided|will|must|shall|accepted|rejected|superseded/i);
}

function addPlanBlocks(ir, context) {
  for (const span of context.spans) {
    const text = stripMarkdown(span.text);
    if (/^\[(done|next|later)\]\s+/i.test(text) || isUnderSection(context.source, span, /phase|milestone|timeline|roadmap|plan/i)) {
      const phase = parsePhase(text, span);
      if (phase) {
        ir.phases.push(phase);
        context.used.add(span.id);
      }
    }
  }
  addNormativeRules(ir, context, /must|shall|required|will|deliver|complete/i);
}

function addGlossaryBlocks(ir, context) {
  const termFacts = [];
  for (const span of context.spans) {
    if (span.kind !== 'key-value' && !isListLike(span)) continue;
    const { name, description } = splitNameDescription(span.text);
    if (!name || !description || name === 'item') continue;
    termFacts.push(fact('definition', name, description, [span]));
    context.used.add(span.id);
  }
  if (termFacts.length) {
    ir.definition = fact('definition', 'terms', `Glossary containing ${termFacts.length} extracted term definitions.`, []);
    ir.props.push(...termFacts.map(term => fact('prop', term.name, term.text, term.spans)));
  }
}

function addReferenceBlocks(ir, context) {
  for (const span of context.spans.filter(span => span.kind === 'key-value' || isListLike(span))) {
    const { name, description } = splitNameDescription(span.text);
    if (!description) continue;
    ir.props.push(fact('prop', name, description, [span]));
    context.used.add(span.id);
  }
}

function addRulesFromSections(ir, context) {
  for (const section of sectionsMatching(context.source.sections, /rule|requirement|policy|standard/i)) {
    for (const span of section.spans.filter(span => span.kind === 'paragraph' || isListLike(span) || span.kind === 'numbered-list')) {
      const text = stripMarkdown(span.text);
      if (!text) continue;
      ir.rules.push(fact('rule', null, text, [span]));
      context.used.add(span.id);
    }
  }
}

function addNormativeRules(ir, context, pattern) {
  for (const span of context.spans) {
    if (context.used.has(span.id)) continue;
    const text = stripMarkdown(span.text);
    if (!pattern.test(text)) continue;
    ir.rules.push(fact('rule', null, text, [span]));
    context.used.add(span.id);
  }
}

function addAttributeFacts(ir, context) {
  for (const section of sectionsMatching(context.source.sections, /required attr|required field|required/i)) {
    for (const span of section.spans.filter(isListLike)) {
      const { name, description } = splitNameDescription(span.text);
      ir.attrs.required.push(fact('attr', name, description, [span]));
      context.used.add(span.id);
    }
  }

  for (const section of sectionsMatching(context.source.sections, /optional attr|optional field|optional/i)) {
    for (const span of section.spans.filter(isListLike)) {
      const { name, description } = splitNameDescription(span.text);
      ir.attrs.optional.push(fact('attr', name, description, [span]));
      context.used.add(span.id);
    }
  }
}

function addDetectedRelationships(ir, context, options) {
  const relationPattern = /([A-Za-z][A-Za-z0-9_-]*)\s+(depends_on|adjacent_to|progression_to|requires|relates_to)\s+([A-Za-z][A-Za-z0-9_-]*)/g;
  for (const span of context.spans) {
    relationPattern.lastIndex = 0;
    let match;
    while ((match = relationPattern.exec(span.text)) !== null) {
      const predicate = match[2];
      if (!predicateAllowed(context.ontology, predicate)) {
        ir.drops.push(drop(span, 'ambiguous', `Predicate "${predicate}" is not declared by the supplied ontology.`));
        continue;
      }
      const subject = toNamespacedId(match[1], context.ontology, options.coinIds);
      const target = toNamespacedId(match[3], context.ontology, options.coinIds);
      if (!namespaceAllowed(context.ontology, subject) || !namespaceAllowed(context.ontology, target)) {
        ir.drops.push(drop(span, 'ambiguous', 'Relationship endpoint namespace is not declared by the supplied ontology.'));
        continue;
      }
      ir.vocab.push({ predicate, definition: predicateDefinition(context.ontology, predicate), spans: [span] });
      ir.rel.push(fact('rel', predicate, 'Reference', [span], { direction: '->', properties: { conf: 'medium' } }));
      ir.edges.push(fact('edge', predicate, null, [span], {
        scope: subject,
        subject,
        target,
        confidence: 'medium',
        extractionMethod: 'inferred',
        properties: {
          conf: 'medium',
          status: 'proposed',
          type: 'inferred',
          src: sourceRef(span, context.source.filePath),
        },
      }));
      context.used.add(span.id);
    }
  }

  ir.vocab = uniqueBy(ir.vocab, item => item.predicate);
  ir.rel = uniqueBy(ir.rel, item => `${item.name}:${item.extra.direction}:${item.text}`);
  ir.edges = uniqueBy(ir.edges, item => `${item.extra.subject}:${item.name}:${item.extra.target}`);
}

function toNamespacedId(value, ontology, coinIds) {
  const token = slugify(value);
  if (coinIds && ontology.mode === 'governed' && ontology.namespaces.has('doc')) return `doc:${token}`;
  return `customer:${token}`;
}

function finalizeDrops(ir, context) {
  const droppedIds = new Set(ir.drops.map(item => item.span.id));
  for (const span of context.spans) {
    if (context.used.has(span.id) || droppedIds.has(span.id)) continue;
    if (span.kind === 'heading' && /^#\s+/.test(span.text.trim())) {
      context.used.add(span.id);
      continue;
    }
    ir.drops.push(drop(span, dropReason(span), dropExplanation(span)));
  }

  ir.metadata.summary = ir.metadata.summary || firstSentence(
    `${ir.metadata.title}. ${ir.definition ? ir.definition.text : ''}`,
    180
  ) || `${ir.metadata.title} converted by sign-ingest.`;
}

function dropReason(span) {
  if (span.kind === 'heading') return 'out-of-scope';
  if (span.normalized.length < 12) return 'low-confidence';
  return 'ambiguous';
}

function dropExplanation(span) {
  if (span.kind === 'heading') return 'Heading used only for section context.';
  if (span.normalized.length < 12) return 'Span was too short to classify confidently.';
  return 'No deterministic v0.1 handler rule placed this span in SIGN.';
}

function addListFacts(target, context, spans, kind) {
  for (const span of spans.filter(span => span.kind === 'paragraph' || isListLike(span))) {
    const text = stripMarkdown(span.text);
    if (!text) continue;
    target.push(fact(kind, null, text, [span]));
    context.used.add(span.id);
  }
}

function parsePhase(text, span) {
  const clean = stripMarkdown(text);
  const match = clean.match(/^\[(done|next|later)\]\s+([^:]+):?\s*(.*)$/i);
  if (match) {
    return fact('phase', match[2].trim(), match[3].trim() || match[2].trim(), [span], { status: `[${match[1].toLowerCase()}]` });
  }
  const { name, description } = splitNameDescription(clean);
  if (!name) return null;
  return fact('phase', name, description || clean, [span], { status: '[later]' });
}

function normalizeConstraint(text) {
  const clean = stripMarkdown(text);
  if (/^(mutex|requires|forbids|enforced-by):/.test(clean)) return clean;
  if (/must not|may not|forbidden|prohibited/i.test(clean)) return `forbids: ${clean}`;
  if (/must|shall|required/i.test(clean)) return `requires: ${clean}`;
  return clean;
}

function sectionsMatching(sections, pattern) {
  return sections.filter(section => pattern.test(section.title));
}

function firstSectionMatching(sections, pattern) {
  return sections.find(section => pattern.test(section.title));
}

function isUnderSection(source, span, pattern) {
  const section = source.sections.find(candidate => candidate.spans.some(item => item.id === span.id));
  return Boolean(section && pattern.test(section.title));
}

function isListLike(span) {
  return span.kind === 'list' || span.kind === 'numbered-list' || span.kind === 'key-value';
}

function fact(kind, name, text, spans = [], extra = {}) {
  return {
    kind,
    name,
    text: normalizeInline(text),
    spans,
    confidence: extra.confidence || 'medium',
    extractionMethod: extra.extractionMethod || 'direct',
    extra,
  };
}

function drop(span, reason, explanation) {
  return {
    reason,
    explanation,
    span: spanToReport(span),
  };
}

function spanToReport(span) {
  return {
    id: span.id,
    file: span.file,
    startLine: span.startLine,
    endLine: span.endLine,
    startByte: span.startByte,
    endByte: span.endByte,
    text: span.text,
  };
}

function sourceRef(span, sourcePath) {
  const relative = path.basename(sourcePath || span.file).replace(/\\/g, '/');
  return `${relative}#L${span.startLine}-L${span.endLine}`;
}

module.exports = {
  DOCTYPE_TO_SIGN_TYPE,
  REGISTERED_DOCTYPES,
  assertDoctype,
  extractIr,
  inferDoctype,
  sourceRef,
  spanToReport,
};
