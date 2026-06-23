# Changelog

## Unreleased

- Added `sign-ingest import okf <dir> -o <out>` — the deterministic Stage-1 OKF→SIGN
  skeletoniser (SIGN Tooling RFC §2). Pure function of the bundle; invents no governance
  (no `@constraints`/`@infer`/`@cluster`/`@boundary`). Emits `@doc`/`@anchor`/`@def`/`@links`/
  `@props`/`@xwalk` skeletons with provisional ids (`prov:<bundle>.<slug>`), the `imported`
  landing-status token, and an `import-report.json` (resolved/unresolved links, typemap misses).
  Unmapped OKF types fail the run unless `--allow-typemap-fallback`. `index.md`/`log.md` skipped.
- Defined the `MarkdownSource` profile seam (`src/okf/markdown-source.js`); OKF is the first
  implementation, the generic-markdown profile is deferred.

## 0.1.0

- Added the initial `sign-ingest` CLI implementation.
- Added deterministic SIGN emission, provenance reports, drop reports, and validator-in-the-loop execution.
- Added v0.1 doctype handler scaffolds for `policy`, `standard`, `adr`, `plan`, `glossary`, and `reference`.

