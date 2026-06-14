'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseFrontMatter } = require('../utils/yaml');
const { normalizeInline, slugify, stripMarkdown } = require('../utils/text');

const TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.text']);
const UNSUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx']);

function readSourceDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (UNSUPPORTED_EXTENSIONS.has(ext)) {
    const err = new Error(`${ext} extraction is not available in this dependency-free MVP; convert to Markdown or text first.`);
    err.code = 'UNSUPPORTED_SOURCE_TYPE';
    throw err;
  }
  if (!TEXT_EXTENSIONS.has(ext)) {
    const err = new Error(`Unsupported source extension "${ext || '(none)'}"; supported inputs are .md, .markdown, .txt, and .text.`);
    err.code = 'UNSUPPORTED_SOURCE_TYPE';
    throw err;
  }

  const absolutePath = path.resolve(filePath);
  const raw = fs.readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '');
  const { data: frontMatter, body } = parseFrontMatter(raw);
  const title = extractTitle(body, frontMatter, absolutePath);
  const lines = makeLineRecords(body, absolutePath);
  const spans = makeSpans(lines);
  const sections = makeSections(spans);

  return {
    filePath: absolutePath,
    raw,
    body,
    frontMatter,
    title,
    lines,
    spans,
    sections,
  };
}

function extractTitle(body, frontMatter, filePath) {
  if (frontMatter.title) return normalizeInline(frontMatter.title);
  const heading = String(body || '').split(/\r?\n/).find(line => /^#\s+/.test(line.trim()));
  if (heading) return stripMarkdown(heading);
  return path.basename(filePath, path.extname(filePath));
}

function makeLineRecords(body, filePath) {
  const lines = String(body || '').split(/\r?\n/);
  const records = [];
  let byteOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const byteLength = Buffer.byteLength(text, 'utf8');
    records.push({
      id: `L${i + 1}`,
      file: filePath,
      line: i + 1,
      startLine: i + 1,
      endLine: i + 1,
      startByte: byteOffset,
      endByte: byteOffset + byteLength,
      text,
      normalized: normalizeInline(text),
    });
    byteOffset += byteLength + 1;
  }

  return records;
}

function makeSpans(lines) {
  const spans = [];
  let buffer = [];

  function flush() {
    if (buffer.length === 0) return;
    const first = buffer[0];
    const last = buffer[buffer.length - 1];
    const text = buffer.map(line => line.text).join('\n');
    const id = `S${spans.length + 1}`;
    spans.push({
      id,
      file: first.file,
      startLine: first.line,
      endLine: last.line,
      startByte: first.startByte,
      endByte: last.endByte,
      text,
      normalized: normalizeInline(text),
      kind: classifySpan(text),
      heading: parseHeading(text),
    });
    buffer = [];
  }

  for (const line of lines) {
    if (!line.normalized) {
      flush();
      continue;
    }
    if (isStandaloneLine(line.text)) {
      flush();
      buffer = [line];
      flush();
      continue;
    }
    buffer.push(line);
  }
  flush();

  return spans;
}

function isStandaloneLine(text) {
  const trimmed = text.trim();
  return /^#{1,6}\s+/.test(trimmed)
    || /^[-*+]\s+/.test(trimmed)
    || /^\d+\.\s+/.test(trimmed)
    || /^(\[[a-z]+\])\s+/i.test(trimmed)
    || /^[A-Za-z][A-Za-z0-9 _/-]{1,50}:\s+/.test(trimmed);
}

function classifySpan(text) {
  const trimmed = text.trim();
  if (/^#{1,6}\s+/.test(trimmed)) return 'heading';
  if (/^[-*+]\s+/.test(trimmed)) return 'list';
  if (/^\d+\.\s+/.test(trimmed)) return 'numbered-list';
  if (/^(\[[a-z]+\])\s+/i.test(trimmed)) return 'phase';
  if (/^[A-Za-z][A-Za-z0-9 _/-]{1,50}:\s+/.test(trimmed)) return 'key-value';
  return 'paragraph';
}

function parseHeading(text) {
  const m = text.trim().match(/^(#{1,6})\s+(.+)$/);
  if (!m) return null;
  return { level: m[1].length, title: stripMarkdown(m[2]), slug: slugify(m[2]) };
}

function makeSections(spans) {
  const sections = [];
  let current = {
    title: 'preamble',
    slug: 'preamble',
    level: 0,
    headingSpan: null,
    spans: [],
  };
  sections.push(current);

  for (const span of spans) {
    if (span.kind === 'heading') {
      current = {
        title: span.heading.title,
        slug: span.heading.slug,
        level: span.heading.level,
        headingSpan: span,
        spans: [],
      };
      sections.push(current);
      continue;
    }
    current.spans.push(span);
  }

  return sections;
}

function discoverInputFiles(inputDir) {
  const root = path.resolve(inputDir);
  const found = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        found.push(full);
      }
    }
  }
  walk(root);
  found.sort((a, b) => a.localeCompare(b));
  return found;
}

module.exports = {
  discoverInputFiles,
  readSourceDocument,
  TEXT_EXTENSIONS,
};

