'use strict';

const path = require('node:path');

function makeDropReport(ir) {
  return {
    sourcePath: ir.manifest.sourcePath,
    document: {
      id: ir.metadata.id,
      doctype: ir.metadata.doctype,
      signType: ir.metadata.signType,
    },
    reasonCodes: ['out-of-scope', 'ambiguous', 'low-confidence', 'unsupported-doctype'],
    items: ir.drops.map((item, index) => ({
      id: `drop-${String(index + 1).padStart(4, '0')}`,
      reason: item.reason,
      explanation: item.explanation,
      span: item.span,
    })),
  };
}

function makeProvenanceReport(ir, emitted) {
  return {
    sourcePath: ir.manifest.sourcePath,
    document: {
      id: ir.metadata.id,
      doctype: ir.metadata.doctype,
      signType: ir.metadata.signType,
    },
    emitter: emitted.manifest.emitter,
    hash: emitted.manifest.hash,
    blocks: emitted.provenance,
  };
}

function outputPathsFor(inputPath, outArg, documentId) {
  const inputDir = path.dirname(path.resolve(inputPath));
  let signPath;
  if (!outArg) {
    signPath = path.join(inputDir, `${documentId}.sign`);
  } else {
    const resolved = path.resolve(outArg);
    if (path.extname(resolved).toLowerCase() === '.sign') {
      signPath = resolved;
    } else {
      signPath = path.join(resolved, `${documentId}.sign`);
    }
  }

  const dir = path.dirname(signPath);
  const stem = path.basename(signPath, '.sign');
  return {
    signPath,
    dropPath: path.join(dir, `${stem}.drop.json`),
    provPath: path.join(dir, `${stem}.prov.json`),
    reviewPath: path.join(dir, `${stem}.review.json`),
  };
}

module.exports = {
  makeDropReport,
  makeProvenanceReport,
  outputPathsFor,
};

