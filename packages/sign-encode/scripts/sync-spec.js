#!/usr/bin/env node
/**
 * sync-spec.js — keep the bundled sign-encode skill reference in step with its
 * canonical source in the sign-lang repository.
 *
 * Canonical source : sign-lang/spec/skill-reference.md
 * Synced copy      : .claude/skills/sign-encode/references/sign-spec.md
 *
 * The spec is vendored at authoring time, never fetched at run time. sign-encode
 * runs against source the operator may regard as their most valuable IP; it has
 * no runtime network dependency and works air-gapped. This script is the only
 * thing that touches the network boundary, and it runs in CI and on a developer
 * machine — never during a skill invocation.
 *
 * Usage:
 *   node scripts/sync-spec.js           Copy canonical -> bundled copy.
 *   node scripts/sync-spec.js --check   Exit non-zero if they have drifted (no write).
 *
 * Resolving the sign-lang checkout:
 *   1. SIGN_LANG_PATH env var, if set (absolute or relative to cwd).
 *   2. Default sibling layout: <sign-tools>/../sign-lang
 */

const fs = require("fs");
const path = require("path");

const PACKAGE_DIR = path.resolve(__dirname, "..");
// packages/sign-encode -> packages -> sign-tools (repo root)
const SIGN_TOOLS_ROOT = path.resolve(PACKAGE_DIR, "..", "..");

const CANONICAL_REL = path.join("spec", "skill-reference.md");
const BUNDLED_PATH = path.join(
  PACKAGE_DIR,
  ".claude",
  "skills",
  "sign-encode",
  "references",
  "sign-spec.md"
);

function resolveSignLangDir() {
  const fromEnv = process.env.SIGN_LANG_PATH;
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(SIGN_TOOLS_ROOT, "..", "sign-lang");
}

function fail(message) {
  console.error(`sync-spec: ${message}`);
  process.exit(1);
}

function main() {
  const check = process.argv.includes("--check");

  const signLangDir = resolveSignLangDir();
  const canonicalPath = path.join(signLangDir, CANONICAL_REL);

  if (!fs.existsSync(canonicalPath)) {
    fail(
      `canonical source not found at ${canonicalPath}\n` +
        `  Set SIGN_LANG_PATH to your sign-lang checkout, or place it beside sign-tools.`
    );
  }

  const canonical = fs.readFileSync(canonicalPath, "utf8");
  const bundled = fs.existsSync(BUNDLED_PATH)
    ? fs.readFileSync(BUNDLED_PATH, "utf8")
    : null;

  if (check) {
    if (bundled === null) fail("bundled copy is missing — run `npm run sync`.");
    if (bundled !== canonical) {
      fail(
        "bundled skill reference has drifted from canonical sign-lang source.\n" +
          `  Canonical: ${canonicalPath}\n` +
          `  Bundled:   ${BUNDLED_PATH}\n` +
          "  Run `npm run sync` to update."
      );
    }
    console.log("sync-spec: in sync with canonical source.");
    return;
  }

  if (bundled === canonical) {
    console.log("sync-spec: already up to date.");
    return;
  }

  fs.mkdirSync(path.dirname(BUNDLED_PATH), { recursive: true });
  fs.writeFileSync(BUNDLED_PATH, canonical);
  console.log(`sync-spec: updated bundled copy from ${canonicalPath}`);
}

main();
