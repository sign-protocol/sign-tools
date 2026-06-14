'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

async function validateSign(sourcePath, options = {}) {
  const candidates = validatorCandidates(options);
  const attempts = [];

  for (const candidate of candidates) {
    try {
      const result = await runValidator(candidate, sourcePath);
      return { ...result, validator: candidate.display };
    } catch (err) {
      if (err.code !== 'ENOENT' && err.code !== 'EPERM' && err.code !== 'VALIDATOR_NOT_FOUND') {
        return {
          ok: false,
          errors: [err.message],
          warnings: [],
          summary: 'validator failed before producing a result',
          validator: candidate.display,
          exitCode: err.exitCode || 1,
        };
      }
      attempts.push(candidate.display);
    }
  }

  return {
    ok: false,
    errors: [
      `SIGN validator not found. Tried: ${attempts.join(', ') || 'sign'}. Install the upstream SIGN validator or set SIGN_VALIDATOR_BIN.`,
    ],
    warnings: [],
    summary: 'validator unavailable',
    validator: null,
    exitCode: 127,
  };
}

function validatorCandidates(options = {}) {
  const candidates = [];
  const envBin = options.validatorBin || process.env.SIGN_VALIDATOR_BIN;
  if (envBin) candidates.push(makeCandidate(envBin));

  candidates.push({ command: 'sign', argsPrefix: ['validate', '--source'], display: 'sign validate --source' });

  const localCandidates = [
    path.resolve(process.cwd(), '..', 'sign-lang', 'validator', 'bin', 'sign.js'),
    path.resolve(__dirname, '..', '..', '..', '..', '..', 'sign-lang', 'validator', 'bin', 'sign.js'),
  ];
  for (const local of localCandidates) {
    if (fs.existsSync(local)) candidates.push(makeCandidate(local));
  }

  const localModules = [
    path.resolve(process.cwd(), '..', 'sign-lang', 'validator', 'src', 'validate.js'),
    path.resolve(__dirname, '..', '..', '..', '..', '..', 'sign-lang', 'validator', 'src', 'validate.js'),
  ];
  for (const modulePath of localModules) {
    if (fs.existsSync(modulePath)) {
      candidates.push({ modulePath, display: `local SIGN validator module ${modulePath}` });
    }
  }

  return candidates;
}

function makeCandidate(commandPath) {
  if (commandPath.endsWith('.js')) {
    return { command: process.execPath, argsPrefix: [commandPath, 'validate', '--source'], display: `${process.execPath} ${commandPath} validate --source` };
  }
  return { command: commandPath, argsPrefix: ['validate', '--source'], display: `${commandPath} validate --source` };
}

function runValidator(candidate, sourcePath) {
  if (candidate.modulePath) {
    return runValidatorModule(candidate.modulePath, sourcePath);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(candidate.command, [...candidate.argsPrefix, sourcePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.on('error', err => reject(err));
    child.on('close', code => {
      const parsed = parseValidatorOutput(stdout, stderr);
      resolve({
        ok: code === 0,
        errors: parsed.errors,
        warnings: parsed.warnings,
        summary: parsed.summary || (code === 0 ? 'pass' : 'fail'),
        stdout,
        stderr,
        exitCode: code,
      });
    });
  });
}

async function runValidatorModule(modulePath, sourcePath) {
  const validator = require(modulePath);
  if (!validator || typeof validator.validate !== 'function') {
    const err = new Error(`Local SIGN validator module has no validate() export: ${modulePath}`);
    err.code = 'VALIDATOR_NOT_FOUND';
    throw err;
  }
  const result = await validator.validate(sourcePath);
  return {
    ok: result.ok,
    errors: result.errors || [],
    warnings: result.warnings || [],
    summary: result.summary || (result.ok ? 'pass' : 'fail'),
    stdout: '',
    stderr: '',
    exitCode: result.ok ? 0 : 1,
  };
}

function parseValidatorOutput(stdout, stderr) {
  const errors = [];
  const warnings = [];
  let summary = '';
  const lines = `${stdout}\n${stderr}`.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('error ')) {
      errors.push(line.slice(6));
    } else if (line.startsWith('warn ')) {
      warnings.push(line.slice(5));
    } else if (line === 'fail') {
      summary = summary || 'fail';
    } else {
      summary = line;
    }
  }
  return { errors, warnings, summary };
}

module.exports = { parseValidatorOutput, validateSign };
