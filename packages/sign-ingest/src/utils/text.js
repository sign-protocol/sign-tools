'use strict';

const path = require('node:path');

function slugify(value, fallback = 'document') {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function docIdFromFile(filePath) {
  const stem = path.basename(filePath, path.extname(filePath));
  const compact = stem.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return compact ? compact.toUpperCase() : 'DOCUMENT';
}

function firstSentence(text, max = 180) {
  const normalized = normalizeInline(text);
  if (!normalized) return '';
  const sentence = normalized.match(/^(.+?[.!?])(\s|$)/);
  const candidate = sentence ? sentence[1] : normalized;
  return candidate.length <= max ? candidate : `${candidate.slice(0, max - 1).trim()}...`;
}

function normalizeInline(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function stripMarkdown(value) {
  return normalizeInline(value)
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/^#+\s+/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function splitNameDescription(text) {
  const stripped = stripMarkdown(text);
  const pipe = stripped.indexOf('|');
  if (pipe !== -1) {
    return {
      name: normalizeToken(stripped.slice(0, pipe)),
      description: normalizeInline(stripped.slice(pipe + 1)),
    };
  }

  const colon = stripped.indexOf(':');
  if (colon > 0 && colon < 80) {
    return {
      name: normalizeToken(stripped.slice(0, colon)),
      description: normalizeInline(stripped.slice(colon + 1)),
    };
  }

  const dash = stripped.indexOf(' - ');
  if (dash > 0 && dash < 80) {
    return {
      name: normalizeToken(stripped.slice(0, dash)),
      description: normalizeInline(stripped.slice(dash + 3)),
    };
  }

  const firstWords = stripped.split(/\s+/).slice(0, 4).join(' ');
  return {
    name: normalizeToken(firstWords),
    description: stripped,
  };
}

function normalizeToken(value) {
  return slugify(value, 'item');
}

function indentBlock(text, width = 2) {
  const pad = ' '.repeat(width);
  return String(text || '')
    .split(/\r?\n/)
    .map(line => `${pad}${line.trimEnd()}`)
    .join('\n');
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

module.exports = {
  docIdFromFile,
  firstSentence,
  indentBlock,
  normalizeInline,
  normalizeToken,
  slugify,
  splitNameDescription,
  stripMarkdown,
  uniqueBy,
};

