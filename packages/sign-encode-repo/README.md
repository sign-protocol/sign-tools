# @sign-tools/sign-encode-repo

A Claude Code skill that walks a repository and generates its **SIGN engineering canon** — a small,
governed set of documents that tells a coding agent what the repo is, how it is built, what it
depends on, and what rules bind it.

An agent arriving at an encoded repo orients from a short, always-loaded index instead of reading the tree.

**For code repositories.** sign-encode-repo works on a repository of source code with build manifests
(`*.csproj`, `package.json`, `pyproject.toml`, `go.mod`, `pom.xml`, `build.gradle`, `Cargo.toml`,
`Gemfile`); it reads them to derive the module graph. For a repository of documents (policies,
standards, ADRs), use [`sign-ingest`](../sign-ingest) or [`sign-draft`](../sign-draft) instead.

- **Skill:** [`.claude/skills/sign-encode-repo/SKILL.md`](.claude/skills/sign-encode-repo/SKILL.md)
- **Spec:** [SIGN v1.0](https://github.com/sign-protocol/sign-lang) — vendored at
  [`references/sign-spec.md`](.claude/skills/sign-encode-repo/references/sign-spec.md)
- **License:** Apache-2.0

## What it produces

```
.agent/sign/
  canon.source.json
  src/
    <PREFIX>-OVERVIEW.sign      what this repo is, and what it is not
    <PREFIX>-ARCH.sign          structure, dependency direction, constraints
    <PREFIX>-DEPS.sign          module graph, external packages, cross-repo edges
    <PREFIX>-STANDARDS.sign     repo-specific rules only
  dist/
    codebase.<slug>.index.sign         Layer 1 — always-injected index
    codebase.<slug>.bundle.sign        Layer 2 — full documents
    codebase.<slug>.bundle.sign.sha256
    codebase.<slug>.manifest.json
    codebase.<slug>.coverage.json
```

Plus a delimited block in `AGENTS.md` and `CLAUDE.md` pointing agents at the canon.

## Trust posture

This skill runs against source you may regard as your most valuable IP. Read
[`references/safety.md`](.claude/skills/sign-encode-repo/references/safety.md) before running it — it is
the enforceable detail behind these claims, not a disclaimer.

- **Bounded writes.** Only `.agent/sign/**` and one delimited block in the agent files. The full
  list is in the skill's Operating Contract and is exhaustive.
- **No source mutation.** Never edits source, tests, build files, or CI. Never deletes. Never runs
  a git write.
- **No egress.** No repository content reaches a network endpoint. The spec is vendored at
  authoring time via `npm run sync`, never fetched at run time. Works air-gapped.
- **Secrets never land in output.** A mandatory redaction pass runs before any write; every
  redaction is reported to you as a security finding.
- **Pointers, not payload.** Artifacts cite `File.ext:42` and quote verbatim only constants, enums,
  config keys, and regexes — never algorithm bodies.
- **Honest provenance.** Everything generated is marked `machine-drafted` and `type:inferred`.
  Only mechanically-extracted dependency edges are `asserted`. Coverage is reported as a split —
  *"87% under governance, 0% human-ratified"* — never as a single flattering number.
- **Nothing leaves your machine.** Every artifact is a local file you review. Committing or sharing
  is your action, not the skill's.

The canon this produces is a well-informed starting map. It is not ratified, and the skill will not
let you forget that.

## Usage

Install the skill (copy `.claude/skills/sign-encode-repo/` into your project's `.claude/skills/`, or
install this package), then ask Claude Code:

> SIGN-encode this repo

> Refresh the SIGN canon for order-service

On a first encode the skill states its full write list and waits for your go-ahead.

## Refresh behavior

Re-running is safe and idempotent. Documents still marked `machine-drafted` are regenerated;
documents a human has landed (token removed) are **left alone** and reported as skipped. If the
code has drifted from a landed document, that is raised as a finding for a human rather than
silently overwritten.

## Development

```bash
npm run sync         # pull the canonical spec from a sign-lang checkout
npm run check-sync   # fail if the vendored copy has drifted (runs in CI)
```

Set `SIGN_LANG_PATH` if `sign-lang` is not checked out beside `sign-tools`.

## Related

| Skill | Use it for |
|---|---|
| [`sign-draft`](../sign-draft) | authoring one SIGN document from intent |
| [`sign-ingest`](../sign-ingest) | converting one existing markdown document into SIGN |
