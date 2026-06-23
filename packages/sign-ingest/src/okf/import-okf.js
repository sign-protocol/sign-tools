'use strict';

// OKF importer — Stage 1, deterministic (RFC §2).
//
// Pure function of the bundle. INVENTS NO GOVERNANCE: it emits @doc/@anchor/@def/@links/
// @props/@xwalk skeletons and never @constraints/@infer/@cluster/@boundary — those are
// governance a CLI cannot assert from structure alone. Stage 2 (the sign-draft skill) reads
// each skeleton plus the original prose and proposes governance as type:inferred for review.
//
// Identity: OKF identity is the file path (unstable across renames). Stage 1 rebinds each
// concept to a provisional canonical id (prov:<bundle>.<slug>) and records the OKF path via
// @xwalk, so a later file move updates the mapping, not the identity. Provisional ids are
// derived from the relative path, so re-importing the same bundle is idempotent on id.

const fs   = require('node:fs');
const path = require('node:path');
const { OKF_PROFILE } = require('./markdown-source');
const { loadTypemap, resolveType } = require('./typemap');
const { slugify } = require('../utils/text');

const LANDING_STATUS = 'imported';   // RFC §2.3 decision 1 — filterable, not confused with hand-drafted `draft`
const ID_PREFIX      = 'prov';       // RFC §2.3 decision 2 — visibly non-canonical
const SKELETON_VERSION = 'v0';       // not authoritative until an approver lands it (bumps a real version)

// ── posix path helpers (link resolution is bundle-relative, sep-agnostic) ──────
function posixNormalize(p) {
  const parts = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

function posixDir(relPath) {
  const i = relPath.lastIndexOf('/');
  return i === -1 ? '' : relPath.slice(0, i);
}

function provisionalId(bundle, relPath) {
  const stem = relPath.replace(/\.(md|markdown)$/i, '');
  return `${ID_PREFIX}:${bundle}.${slugify(stem)}`;
}

// Resolve a markdown href (relative to the linking concept) to a known concept's relPath.
function resolveHref(fromRelPath, href, conceptPaths) {
  const base = posixDir(fromRelPath);
  const cleaned = href.split('#')[0].split('?')[0];
  if (!cleaned) return null;
  const joined = posixNormalize(base ? `${base}/${cleaned}` : cleaned);
  const candidates = [joined];
  if (!/\.(md|markdown)$/i.test(joined)) {
    candidates.push(`${joined}.md`, `${joined}/index.md`);
  }
  for (const c of candidates) {
    if (conceptPaths.has(c)) return c;
  }
  return null;
}

// Indent retained prose so it is always parsed as @def body, never as a sigil/summary
// (col-0 '@'/'## ' would break out; indenting guarantees neither happens).
function retainBody(body) {
  return body
    .split(/\r?\n/)
    .map(line => (line.trim() === '' ? '' : `  ${line.trimEnd()}`))
    .join('\n')
    .replace(/\n+$/, '');
}

function emitSkeleton(concept, ctx) {
  const { bundle, typemap, audience } = ctx;
  const { type, miss } = resolveType(concept.okfType, typemap);
  const docId = ctx.idByPath.get(concept.relPath);
  const headword = slugify(concept.title, path.basename(concept.relPath, path.extname(concept.relPath)));

  // Resolve markdown links to provisional ids; unresolved are reported, never guessed.
  const resolvedLinks = [];
  const unresolved = [];
  for (const link of concept.links) {
    const target = resolveHref(concept.relPath, link.href, ctx.conceptPaths);
    if (target && target !== concept.relPath) {
      const id = ctx.idByPath.get(target);
      if (id && !resolvedLinks.includes(id)) resolvedLinks.push(id);
    } else if (!target) {
      unresolved.push({ from: concept.relPath, href: link.href });
    }
  }

  const lines = [];
  lines.push(`@doc ${docId} [${type}, ${LANDING_STATUS}, ${audience}] ${SKELETON_VERSION}`);
  if (resolvedLinks.length) lines.push(`@links ${resolvedLinks.join(',')}`);
  lines.push(`@anchor [okf:v0.1, src:${bundle}]`);
  lines.push(`  + ${concept.relPath}`);
  if (concept.timestamp) lines.push(`@reviewed ${concept.timestamp}`);
  lines.push(`@def ${headword}`);
  lines.push(`  ${concept.description || concept.title}`);
  lines.push('  # TODO(sign-draft): enrich with governance (@constraints/@infer/@boundary) from the prose below.');
  const retained = retainBody(concept.body);
  if (retained) lines.push(retained);
  if (concept.tags.length) {
    lines.push('@props');
    for (const tag of concept.tags) lines.push(`  + tag:${slugify(tag)}`);
  }
  lines.push('@xwalk');
  lines.push(`  okf:${concept.relPath} => ${docId} [method:okf-import, type:asserted]`);

  return {
    signText: lines.join('\n') + '\n',
    docId,
    resolvedLinks,
    unresolved,
    typemapMiss: miss ? concept.okfType : null,
  };
}

/**
 * Import an OKF bundle into SIGN skeletons. Pure: does not touch the filesystem (the caller
 * writes the returned skeletons + report). Deterministic given the same bundle + options.
 *
 * options: { bundle?, typemapPath?, audience?, allowTypemapFallback?, profile? }
 * returns: { ok, bundle, skeletons: [{ relPath, fileName, docId, signText }], report }
 */
function importOkf(okfDir, options = {}) {
  const profile = options.profile || OKF_PROFILE;
  const bundle = options.bundle || path.basename(path.resolve(okfDir));
  const audience = options.audience || 'agents';
  const typemap = loadTypemap(options.typemapPath);

  const files = profile.discover(okfDir);
  const concepts = [];
  for (const abs of files) {
    const concept = profile.readConcept(abs, okfDir);
    if (profile.isConcept(concept.relPath, concept)) concepts.push(concept);
  }
  concepts.sort((a, b) => a.relPath.localeCompare(b.relPath));

  // First pass: assign provisional ids so links can resolve to them.
  const idByPath = new Map();
  const conceptPaths = new Set(concepts.map(c => c.relPath));
  for (const c of concepts) idByPath.set(c.relPath, provisionalId(bundle, c.relPath));

  const ctx = { bundle, typemap, audience, idByPath, conceptPaths };
  const skeletons = [];
  const unresolvedLinks = [];
  const typemapMissCounts = new Map();   // okfType -> count
  let resolvedLinkCount = 0;

  for (const concept of concepts) {
    const out = emitSkeleton(concept, ctx);
    skeletons.push({
      relPath: concept.relPath,
      fileName: `${slugify(out.docId.replace(/^prov:/, ''))}.sign`,
      docId: out.docId,
      signText: out.signText,
    });
    resolvedLinkCount += out.resolvedLinks.length;
    unresolvedLinks.push(...out.unresolved);
    if (out.typemapMiss) {
      typemapMissCounts.set(out.typemapMiss, (typemapMissCounts.get(out.typemapMiss) || 0) + 1);
    }
  }

  const typemapMisses = [...typemapMissCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([type, count]) => ({ type, fell_back_to: 'ref', count }));

  const report = {
    bundle,
    concepts_in: concepts.length,
    skeletons_out: skeletons.length,
    links: { resolved: resolvedLinkCount, unresolved: unresolvedLinks.length },
    unresolved_links: unresolvedLinks,
    typemap_misses: typemapMisses,
    provisional_ids: skeletons.length,
    todo_governance: skeletons.length,
  };

  const ok = typemapMisses.length === 0 || Boolean(options.allowTypemapFallback);
  return { ok, bundle, skeletons, report };
}

// Write the skeletons + import-report.json to outDir. Returns paths written.
function writeImport(result, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const written = [];
  for (const skel of result.skeletons) {
    const dest = path.join(outDir, skel.fileName);
    fs.writeFileSync(dest, skel.signText, 'utf8');
    written.push(dest);
  }
  const reportPath = path.join(outDir, 'import-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(result.report, null, 2) + '\n', 'utf8');
  written.push(reportPath);
  return { written, reportPath };
}

module.exports = { importOkf, writeImport, provisionalId, resolveHref, LANDING_STATUS, ID_PREFIX };
