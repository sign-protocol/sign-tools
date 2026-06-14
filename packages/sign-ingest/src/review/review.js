'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const { writeJson } = require('../utils/json');

function applyExistingReview(signText, reviewPath, force = false) {
  if (force || !fs.existsSync(reviewPath)) return { signText, applied: false };
  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  if (review && review.status === 'accepted' && review.signText) {
    return { signText: review.signText.endsWith('\n') ? review.signText : `${review.signText}\n`, applied: true };
  }
  return { signText, applied: false };
}

async function runReview({ sourcePath, signPath, signText, dropReport, reviewPath }) {
  if (!process.stdin.isTTY) {
    writeJson(reviewPath, {
      status: 'pending',
      sourcePath,
      signPath,
      createdBy: 'sign-ingest',
      note: '--review was requested in a non-interactive terminal. Re-run in a TTY to accept or edit.',
      dropCount: dropReport.items.length,
    });
    return { signText, status: 'pending' };
  }

  output.write('\n--- SIGN preview ---\n');
  output.write(signText);
  output.write('\n--- Drop report ---\n');
  for (const item of dropReport.items) {
    output.write(`${item.reason}: ${item.span.file}:${item.span.startLine}-${item.span.endLine} ${item.explanation}\n`);
  }

  const rl = readline.createInterface({ input, output });
  const answer = (await rl.question('\nAccept emitted SIGN? [a]ccept, [e]dit file first, [r]eject: ')).trim().toLowerCase();
  rl.close();

  if (answer === 'r' || answer === 'reject') {
    writeJson(reviewPath, {
      status: 'rejected',
      sourcePath,
      signPath,
      dropCount: dropReport.items.length,
    });
    const err = new Error('Review rejected emitted SIGN.');
    err.exitCode = 4;
    throw err;
  }

  let finalText = signText;
  if (answer === 'e' || answer === 'edit') {
    output.write(`Edit ${signPath}, then press Enter here to continue.`);
    await waitForEnter();
    finalText = fs.readFileSync(signPath, 'utf8');
  }

  writeJson(reviewPath, {
    status: 'accepted',
    sourcePath,
    signPath,
    signText: finalText,
    dropCount: dropReport.items.length,
  });
  return { signText: finalText.endsWith('\n') ? finalText : `${finalText}\n`, status: 'accepted' };
}

async function waitForEnter() {
  const rl = readline.createInterface({ input, output });
  await rl.question('');
  rl.close();
}

function reviewPathFor(signPath) {
  return path.join(path.dirname(signPath), `${path.basename(signPath, '.sign')}.review.json`);
}

module.exports = { applyExistingReview, reviewPathFor, runReview };

