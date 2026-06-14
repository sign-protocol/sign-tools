'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { emitSign } = require('./emitter/sign-emitter');
const { extractIr } = require('./handlers/registry');
const { loadOntology } = require('./ontology/load');
const { makeDropReport, makeProvenanceReport, outputPathsFor } = require('./reports/reports');
const { applyExistingReview, runReview } = require('./review/review');
const { readSourceDocument, discoverInputFiles } = require('./document/source');
const { writeJson } = require('./utils/json');
const { parseYaml } = require('./utils/yaml');
const { validateSign } = require('./validator-bridge/validator');

async function convertDocument(inputPath, options = {}) {
  const source = readSourceDocument(inputPath);
  const ontology = options.ontology || loadOntology(options.ontologyPath);
  const ir = extractIr(source, {
    doctype: options.doctype,
    ontology,
    coinIds: options.coinIds,
  });
  const out = outputPathsFor(inputPath, options.out, ir.metadata.id);
  const emitted = emitSign(ir, { ontology });
  const dropReport = makeDropReport(ir);
  const provReport = makeProvenanceReport(ir, emitted);

  fs.mkdirSync(path.dirname(out.signPath), { recursive: true });
  let signText = emitted.signText;
  const existingReview = applyExistingReview(signText, out.reviewPath, Boolean(options.force));
  signText = existingReview.signText;

  fs.writeFileSync(out.signPath, signText, 'utf8');
  writeJson(out.dropPath, dropReport);
  writeJson(out.provPath, provReport);

  if (options.review) {
    const review = await runReview({
      sourcePath: source.filePath,
      signPath: out.signPath,
      signText,
      dropReport,
      reviewPath: out.reviewPath,
    });
    signText = review.signText;
    fs.writeFileSync(out.signPath, signText, 'utf8');
  }

  let validation = await validateSign(out.signPath, options);
  if (!validation.ok && !options.noRepair) {
    const repaired = repairForValidation(signText, validation);
    if (repaired !== signText) {
      fs.writeFileSync(out.signPath, repaired, 'utf8');
      signText = repaired;
      validation = await validateSign(out.signPath, options);
    }
  }

  return {
    ok: validation.ok,
    sourcePath: source.filePath,
    signPath: out.signPath,
    dropPath: out.dropPath,
    provPath: out.provPath,
    reviewPath: out.reviewPath,
    validation,
    dropCount: dropReport.items.length,
    provenanceCount: provReport.blocks.length,
    reviewApplied: existingReview.applied,
  };
}

async function batchConvert(inputDir, options = {}) {
  const files = discoverInputFiles(inputDir);
  const doctypeMap = options.doctypeMapPath ? readConfig(options.doctypeMapPath) : {};
  const results = [];
  for (const file of files) {
    const key = path.basename(file);
    const doctype = options.doctype || doctypeMap[key] || doctypeMap[path.relative(inputDir, file)] || doctypeMap.default;
    try {
      results.push(await convertDocument(file, {
        ...options,
        doctype,
        out: options.out,
        review: false,
      }));
    } catch (err) {
      results.push({
        ok: false,
        sourcePath: file,
        error: err.message,
      });
    }
  }
  return results;
}

async function doctor(signPath, options = {}) {
  const resolved = path.resolve(signPath);
  const dir = path.dirname(resolved);
  const stem = path.basename(resolved, '.sign');
  const dropPath = path.join(dir, `${stem}.drop.json`);
  const validation = await validateSign(resolved, options);
  let dropReport = null;
  if (fs.existsSync(dropPath)) {
    dropReport = JSON.parse(fs.readFileSync(dropPath, 'utf8'));
  }
  return { validation, dropPath, dropReport };
}

async function promote(signPath, options = {}) {
  const resolved = path.resolve(signPath);
  let text = fs.readFileSync(resolved, 'utf8');
  const proposedPattern = /\[([^\]]*status:proposed[^\]]*)\]/g;
  const proposed = [...text.matchAll(proposedPattern)];
  if (proposed.length === 0) return { changed: false, proposedCount: 0, signPath: resolved };
  if (!options.acceptAll && !process.stdin.isTTY) {
    const err = new Error('Proposed edges found, but promote needs --accept-all in a non-interactive terminal.');
    err.exitCode = 3;
    throw err;
  }
  text = text.replace(/status:proposed/g, 'status:validated').replace(/type:inferred/g, 'type:asserted');
  fs.writeFileSync(resolved, text, 'utf8');
  const validation = await validateSign(resolved, options);
  return { changed: true, proposedCount: proposed.length, signPath: resolved, validation };
}

function readConfig(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return path.extname(filePath).toLowerCase() === '.json' ? JSON.parse(raw) : parseYaml(raw);
}

function repairForValidation(signText, validation) {
  let repaired = signText;
  for (const error of validation.errors || []) {
    const missing = error.match(/predicate "([^"]+)" used in @rel or @edges but not declared in @vocab/);
    if (missing && !repaired.includes('@vocab')) {
      repaired = repaired.replace(/\n(@def\s+)/, `\n@vocab\n  ${missing[1]} | Recovered predicate definition from validation repair pass.\n\n$1`);
    }
  }
  return repaired;
}

module.exports = {
  batchConvert,
  convertDocument,
  doctor,
  loadOntology,
  promote,
};

