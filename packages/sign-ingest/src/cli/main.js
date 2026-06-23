'use strict';

const path = require('node:path');
const { batchConvert, convertDocument, doctor, promote, importOkf, writeImport } = require('..');

const VERSION = '0.1.0';

async function main(argv = []) {
  if (argv.length === 0 || has(argv, '--help') || has(argv, '-h')) {
    printUsage();
    return;
  }
  if (has(argv, '--version') || has(argv, '-v')) {
    console.log(VERSION);
    return;
  }

  const [command, ...rest] = argv;
  switch (command) {
    case 'convert':
      await runConvert(rest);
      break;
    case 'batch':
      await runBatch(rest);
      break;
    case 'doctor':
      await runDoctor(rest);
      break;
    case 'promote':
      await runPromote(rest);
      break;
    case 'import':
      await runImport(rest);
      break;
    default: {
      const err = new Error(`Unknown command "${command}".`);
      err.exitCode = 2;
      throw err;
    }
  }
}

async function runConvert(args) {
  const input = positional(args)[0];
  if (!input) usageError('convert requires <input>.');
  const result = await convertDocument(input, {
    doctype: value(args, '--doctype'),
    out: value(args, '--out'),
    ontologyPath: value(args, '--ontology'),
    review: has(args, '--review'),
    force: has(args, '--force'),
    coinIds: has(args, '--coin-ids'),
    validatorBin: value(args, '--validator-bin'),
    strictSemantic: has(args, '--strict-semantic'),
    minGapChars: intValue(args, '--min-gap-chars'),
  });
  printConvertResult(result);
  if (!result.ok) process.exitCode = 1;
}

async function runBatch(args) {
  const inputDir = positional(args)[0];
  const out = value(args, '--out');
  if (!inputDir) usageError('batch requires <input-dir>.');
  if (!out) usageError('batch requires --out <out-dir>.');
  const results = await batchConvert(inputDir, {
    out,
    doctype: value(args, '--doctype'),
    doctypeMapPath: value(args, '--doctype-map'),
    ontologyPath: value(args, '--ontology'),
    force: has(args, '--force'),
    coinIds: has(args, '--coin-ids'),
    validatorBin: value(args, '--validator-bin'),
    strictSemantic: has(args, '--strict-semantic'),
    minGapChars: intValue(args, '--min-gap-chars'),
  });
  let failed = 0;
  for (const result of results) {
    if (result.ok) {
      console.log(`ok    ${path.relative(process.cwd(), result.sourcePath)} -> ${path.relative(process.cwd(), result.signPath)}`);
    } else {
      failed += 1;
      console.error(`fail  ${path.relative(process.cwd(), result.sourcePath)} ${result.error || result.validation?.summary || ''}`);
    }
  }
  console.log(`batch complete — ${results.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

async function runDoctor(args) {
  const input = positional(args)[0];
  if (!input) usageError('doctor requires <out.sign>.');
  const result = await doctor(input, { validatorBin: value(args, '--validator-bin') });
  printValidation(result.validation);
  if (result.dropReport) {
    console.log(`drop report: ${result.dropPath}`);
    console.log(`drops: ${result.dropReport.items.length}`);
    for (const item of result.dropReport.items.slice(0, 20)) {
      console.log(`- ${item.reason} ${item.span.file}:${item.span.startLine}-${item.span.endLine} ${item.explanation}`);
    }
    if (result.dropReport.items.length > 20) {
      console.log(`... ${result.dropReport.items.length - 20} more`);
    }
  } else {
    console.warn(`drop report not found: ${result.dropPath}`);
  }
  if (!result.validation.ok) process.exitCode = 1;
}

async function runPromote(args) {
  const input = positional(args)[0];
  if (!input) usageError('promote requires <out.sign>.');
  const result = await promote(input, {
    acceptAll: has(args, '--accept-all'),
    validatorBin: value(args, '--validator-bin'),
  });
  if (!result.changed) {
    console.log('no proposed edges found');
    return;
  }
  console.log(`promoted ${result.proposedCount} proposed edge(s) in ${result.signPath}`);
  printValidation(result.validation);
  if (!result.validation.ok) process.exitCode = 1;
}

async function runImport(args) {
  const kind = positional(args)[0];
  if (kind !== 'okf') usageError('import requires a kind: "okf" (only OKF is supported).');
  const okfDir = positional(args)[1];
  const out = value(args, '-o') || value(args, '--out');
  if (!okfDir) usageError('import okf requires <okf-dir>.');
  if (!out) usageError('import okf requires -o <out-dir>.');

  const result = importOkf(okfDir, {
    bundle: value(args, '--bundle'),
    typemapPath: value(args, '--typemap'),
    audience: value(args, '--audience'),
    allowTypemapFallback: has(args, '--allow-typemap-fallback'),
  });
  const { reportPath } = writeImport(result, out);
  const r = result.report;

  const rel = file => path.relative(process.cwd(), file);
  console.log(`bundle:      ${r.bundle}`);
  console.log(`concepts:    ${r.concepts_in} in -> ${r.skeletons_out} skeleton(s)`);
  console.log(`links:       ${r.links.resolved} resolved, ${r.links.unresolved} unresolved`);
  for (const u of r.unresolved_links) console.warn(`warn  unresolved link ${u.from} -> ${u.href}`);
  for (const m of r.typemap_misses) console.warn(`warn  typemap miss type:${m.type} (×${m.count}) fell back to ${m.fell_back_to}`);
  console.log(`governance:  ${r.todo_governance} skeleton(s) marked TODO(sign-draft)`);
  console.log(`report:      ${rel(reportPath)}`);

  if (!result.ok) {
    console.error('fail — unmapped OKF type(s); add a --typemap entry or pass --allow-typemap-fallback.');
    process.exitCode = 1;
  }
}

function printConvertResult(result) {
  const rel = file => path.relative(process.cwd(), file);
  console.log(`${result.ok ? 'ok' : 'fail'}   ${rel(result.sourcePath)} -> ${rel(result.signPath)}`);
  console.log(`drop report: ${rel(result.dropPath)} (${result.dropCount} drops)`);
  console.log(`provenance:  ${rel(result.provPath)} (${result.provenanceCount} entries)`);
  if (result.reviewApplied) console.log(`review:      ${rel(result.reviewPath)} applied`);
  printSemantic(result.semanticCompleteness, rel(result.semanticPath));
  printValidation(result.validation);
}

function printSemantic(semantic, semanticPathRel) {
  if (!semantic) return;
  console.log(`semantic:    ${semanticPathRel} (coverage ${Math.round(semantic.coverage * 100)}%, ${semantic.gapCount} gap(s), ${semantic.highGapCount} high)`);
  for (const gap of semantic.gaps || []) {
    const where = gap.span ? `${gap.span.file}:${gap.span.startLine}-${gap.span.endLine}` : '';
    console.warn(`warn  semantic gap [${gap.severity} ${gap.kind}] ${where} ${gap.excerpt}`);
  }
}

function printValidation(validation) {
  if (!validation) return;
  for (const warning of validation.warnings || []) console.warn(`warn  ${warning}`);
  for (const error of validation.errors || []) console.error(`error ${error}`);
  console.log(`validator: ${validation.validator || 'unavailable'}`);
  console.log(`validation: ${validation.summary}`);
}

function printUsage() {
  console.log([
    'Usage:',
    '  sign-ingest convert <input> [--doctype TYPE] [--out PATH] [--ontology PATH] [--review] [--force] [--coin-ids] [--strict-semantic] [--min-gap-chars N]',
    '  sign-ingest batch <input-dir> --out <out-dir> [--doctype-map PATH] [--ontology PATH] [--strict-semantic]',
    '  sign-ingest doctor <out.sign>',
    '  sign-ingest promote <out.sign> [--accept-all]',
    '  sign-ingest import okf <okf-dir> -o <out-dir> [--bundle NAME] [--typemap okf.typemap.json] [--audience AUD] [--allow-typemap-fallback]',
    '',
    'Registered doctypes: policy, standard, adr, plan, glossary, reference',
  ].join('\n'));
}

function usageError(message) {
  const err = new Error(message);
  err.exitCode = 2;
  throw err;
}

function has(args, flag) {
  return args.includes(flag);
}

function value(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function intValue(args, flag) {
  const raw = value(args, flag);
  if (raw === null) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

function positional(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      if (args[i + 1] && !args[i + 1].startsWith('--')) i += 1;
      continue;
    }
    out.push(arg);
  }
  return out;
}

module.exports = { main };

