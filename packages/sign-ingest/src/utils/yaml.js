'use strict';

// A deliberately small YAML reader for the config shapes used by sign-ingest.
// It supports mappings, arrays, inline arrays, quoted scalars, booleans, and numbers.
function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = String(text || '').split(/\r?\n/);

  for (const raw of lines) {
    const withoutComment = stripComment(raw);
    if (!withoutComment.trim()) continue;
    const indent = withoutComment.match(/^\s*/)[0].length;
    const trimmed = withoutComment.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].value;

    if (trimmed.startsWith('- ')) {
      if (!Array.isArray(parent)) {
        throw new Error('YAML sequence item found where parent is not a sequence');
      }
      parent.push(parseScalar(trimmed.slice(2).trim()));
      continue;
    }

    const sep = trimmed.indexOf(':');
    if (sep === -1) {
      throw new Error(`Unsupported YAML line: ${trimmed}`);
    }

    const key = trimmed.slice(0, sep).trim();
    const rest = trimmed.slice(sep + 1).trim();
    if (rest) {
      parent[key] = parseScalar(rest);
      continue;
    }

    const nextContainer = lookaheadContainer(lines, raw);
    parent[key] = nextContainer;
    stack.push({ indent, value: nextContainer });
  }

  return root;
}

function lookaheadContainer(lines, currentRaw) {
  const currentIndex = lines.indexOf(currentRaw);
  for (let i = currentIndex + 1; i < lines.length; i++) {
    const line = stripComment(lines[i]);
    if (!line.trim()) continue;
    return line.trim().startsWith('- ') ? [] : {};
  }
  return {};
}

function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if ((ch === '"' || ch === "'") && line[i - 1] !== '\\') {
      quote = quote === ch ? null : quote || ch;
    }
    if (ch === '#' && !quote) return line.slice(0, i);
  }
  return line;
}

function parseScalar(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(part => parseScalar(part.trim()));
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseFrontMatter(text) {
  const normalized = String(text || '').replace(/^\uFEFF/, '');
  if (!normalized.startsWith('---')) return { data: {}, body: normalized };
  const lines = normalized.split(/\r?\n/);
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return { data: {}, body: normalized };
  const yamlText = lines.slice(1, end).join('\n');
  const body = lines.slice(end + 1).join('\n');
  return { data: parseYaml(yamlText), body };
}

module.exports = { parseFrontMatter, parseYaml };

