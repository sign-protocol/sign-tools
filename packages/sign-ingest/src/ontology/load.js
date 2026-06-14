'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseYaml } = require('../utils/yaml');
const { normalizeInline } = require('../utils/text');

function loadOntology(filePath) {
  if (!filePath) return makeFreeformOntology();
  const absolutePath = path.resolve(filePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const ext = path.extname(absolutePath).toLowerCase();
  const parsed = ext === '.json' ? JSON.parse(raw) : parseYaml(raw);
  return normalizeOntology(parsed, absolutePath);
}

function makeFreeformOntology() {
  return {
    mode: 'freeform',
    sourcePath: null,
    signSpec: '>=1.0,<2.0',
    namespaces: new Map([
      ['doc', 'SIGN document'],
      ['customer', 'Customer-imported label'],
      ['legacy', 'Legacy or source-local identifier'],
    ]),
    predicates: new Map(),
    documentId: {},
  };
}

function normalizeOntology(input, sourcePath) {
  const ontology = makeFreeformOntology();
  ontology.mode = 'governed';
  ontology.sourcePath = sourcePath;
  ontology.signSpec = input.signSpec || input['sign-spec'] || ontology.signSpec;
  ontology.documentId = input.documentId || input.document_id || input['document-id'] || {};

  ontology.namespaces = normalizeMap(input.namespaces || input.namespacePrefixes || input['namespace-prefixes']);
  ontology.predicates = normalizeMap(input.predicates || input.vocab || input.vocabulary);

  return ontology;
}

function normalizeMap(value) {
  const map = new Map();
  if (!value) return map;

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        map.set(item.replace(/:$/, ''), '');
      } else if (item && typeof item === 'object') {
        const key = item.prefix || item.name || item.id || item.predicate;
        const description = item.description || item.definition || '';
        if (key) map.set(String(key).replace(/:$/, ''), normalizeInline(description));
      }
    }
    return map;
  }

  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry === 'string') {
        map.set(String(key).replace(/:$/, ''), normalizeInline(entry));
      } else if (entry && typeof entry === 'object') {
        map.set(String(key).replace(/:$/, ''), normalizeInline(entry.description || entry.definition || ''));
      } else {
        map.set(String(key).replace(/:$/, ''), '');
      }
    }
  }

  return map;
}

function predicateAllowed(ontology, predicate) {
  return ontology.mode === 'freeform' || ontology.predicates.has(predicate);
}

function namespaceAllowed(ontology, namespacedId) {
  const prefix = String(namespacedId || '').split(':')[0].replace(/^@/, '');
  return ontology.mode === 'freeform' || ontology.namespaces.has(prefix);
}

function predicateDefinition(ontology, predicate) {
  if (ontology.predicates.has(predicate)) return ontology.predicates.get(predicate);
  return `Freeform predicate inferred by sign-ingest for ${predicate}`;
}

module.exports = {
  loadOntology,
  namespaceAllowed,
  predicateAllowed,
  predicateDefinition,
};

