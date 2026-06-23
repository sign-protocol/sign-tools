'use strict';

// MarkdownSource profile (RFC §2.3, decision 3).
//
// OKF is *constrained* markdown — a directory of files with YAML frontmatter. The general
// case (CLAUDE.md / AGENTS.md / Obsidian vaults) is unconstrained. We define the profile
// interface now so OKF is just one implementation; the generic-markdown profile is deferred.
//
// A MarkdownSource profile is an object:
//   {
//     id:        string,                       // profile name, e.g. "okf-v0.1"
//     discover(rootDir): string[],             // absolute paths of concept files (sorted, stable)
//     isConcept(relPath, frontMatter): bool,   // false for index.md / log.md / non-concepts
//     readConcept(absPath, rootDir): ConceptRecord
//   }
//
// ConceptRecord (the deterministic, profile-agnostic shape the importer consumes):
//   {
//     relPath:     string,            // bundle-relative posix path (stable identity input)
//     okfType:     string,            // frontmatter `type` (required in OKF)
//     title:       string,
//     description: string,            // frontmatter `description` or first body sentence
//     body:        string,            // retained markdown prose (Stage-2 reads this)
//     tags:        string[],
//     timestamp:   string|null,       // ISO date or null
//     links:       { text, href }[]   // markdown links found in the body
//   }

const fs   = require('node:fs');
const path = require('node:path');
const { parseFrontMatter } = require('../utils/yaml');
const { normalizeInline, stripMarkdown, firstSentence } = require('../utils/text');

const TEXT_EXTS = new Set(['.md', '.markdown']);

// Files that are structural, not concepts (RFC §2.2): index.md informs grouping; log.md is
// discarded — history lives in SIGN versioning, not prose.
const NON_CONCEPT_BASENAMES = new Set(['index.md', 'log.md']);

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function discover(rootDir) {
  const root = path.resolve(rootDir);
  const found = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        walk(full);
      } else if (TEXT_EXTS.has(path.extname(entry.name).toLowerCase())) {
        found.push(full);
      }
    }
  }
  walk(root);
  return found.sort((a, b) => a.localeCompare(b));
}

function isConcept(relPath) {
  return !NON_CONCEPT_BASENAMES.has(path.basename(relPath).toLowerCase());
}

// Extract markdown inline links [text](href). Anchor-only (#…) and absolute URLs are skipped;
// only intra-bundle relative links can resolve to a sibling concept.
function extractLinks(body) {
  const links = [];
  const re = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const href = m[2].trim();
    if (!href || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:\/\//i.test(href) || href.startsWith('mailto:')) continue;
    links.push({ text: normalizeInline(m[1]), href });
  }
  return links;
}

function normalizeTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => normalizeInline(String(v))).filter(Boolean);
  return [normalizeInline(String(value))].filter(Boolean);
}

function normalizeTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim();
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  return iso ? iso[0] : s;
}

function readConcept(absPath, rootDir) {
  const raw = fs.readFileSync(absPath, 'utf8').replace(/^﻿/, '');
  const { data: fm, body } = parseFrontMatter(raw);
  const relPath = toPosix(path.relative(path.resolve(rootDir), path.resolve(absPath)));
  const title = normalizeInline(fm.title) || deriveTitleFromBody(body) || path.basename(relPath, path.extname(relPath));
  const description = normalizeInline(fm.description) || firstSentence(stripMarkdown(stripHeadings(body)));
  return {
    relPath,
    okfType: fm.type ? String(fm.type).trim() : '',
    title,
    description,
    body: body.replace(/\s+$/, ''),
    tags: normalizeTags(fm.tags),
    timestamp: normalizeTimestamp(fm.timestamp),
    links: extractLinks(body),
  };
}

function deriveTitleFromBody(body) {
  const heading = String(body || '').split(/\r?\n/).find(l => /^#\s+/.test(l.trim()));
  return heading ? stripMarkdown(heading) : '';
}

function stripHeadings(body) {
  return String(body || '').split(/\r?\n/).filter(l => !/^#{1,6}\s+/.test(l.trim())).join('\n');
}

const OKF_PROFILE = Object.freeze({
  id: 'okf-v0.1',
  discover,
  isConcept,
  readConcept,
});

module.exports = { OKF_PROFILE, extractLinks, normalizeTimestamp, toPosix };
