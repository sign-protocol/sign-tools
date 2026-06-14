#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { convertDocument } = require('../src');

async function main() {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const docs = fs.readdirSync(fixturesDir)
    .filter(name => name.endsWith('.md'))
    .sort();
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-ingest-eval-'));
  let passed = 0;

  for (const doc of docs) {
    const input = path.join(fixturesDir, doc);
    const doctype = doc.split('.')[0].replace(/-.+$/, '');
    const result = await convertDocument(input, { doctype, out: outDir });
    if (result.ok) passed += 1;
    console.log(`${result.ok ? 'ok' : 'fail'} ${doc} drops=${result.dropCount}`);
    if (!result.ok) {
      for (const error of result.validation.errors) console.error(`  ${error}`);
    }
  }

  console.log(`eval complete — ${passed}/${docs.length} validator pass rate`);
  process.exitCode = passed === docs.length ? 0 : 1;
}

main().catch(err => {
  console.error(err.message || String(err));
  process.exitCode = 1;
});

