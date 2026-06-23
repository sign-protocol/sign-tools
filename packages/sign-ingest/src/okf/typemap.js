'use strict';

// OKF type → SIGN doc-type mapping (RFC §2.2).
//
// OKF requires `type` in frontmatter, so a concept always carries one. The open package
// ships the default below; a corpus may override it with an `okf.typemap.json` file
// (`--typemap`). The canonical/authoritative map is platform-owned (RFC §2.3, decision 4) —
// this default is a sensible starting point, not the source of truth.
//
// An unmapped type is a *decision*, not a default: the importer records a `typemap_miss`,
// falls back to `ref`, and `sign import okf` exits non-zero unless --allow-typemap-fallback.

const fs = require('node:fs');

const DEFAULT_TYPEMAP = Object.freeze({
  table:    'ref',
  dataset:  'ref',
  metric:   'std',
  api:      'ref',
  runbook:  'pol',
  playbook: 'pol',
});

const FALLBACK_TYPE = 'ref';

function loadTypemap(typemapPath) {
  if (!typemapPath) return { ...DEFAULT_TYPEMAP };
  const raw = fs.readFileSync(typemapPath, 'utf8');
  const overrides = JSON.parse(raw);
  // Corpus overrides extend the default; an override can also re-map a default entry.
  return { ...DEFAULT_TYPEMAP, ...overrides };
}

// Resolve an OKF type to a SIGN type token. Returns { type, miss } where `miss` is true when
// the OKF type was not in the map and we fell back — the caller records it and may fail the run.
function resolveType(okfType, typemap) {
  const key = String(okfType || '').trim();
  if (Object.prototype.hasOwnProperty.call(typemap, key)) {
    return { type: typemap[key], miss: false };
  }
  return { type: FALLBACK_TYPE, miss: true };
}

module.exports = { DEFAULT_TYPEMAP, FALLBACK_TYPE, loadTypemap, resolveType };
