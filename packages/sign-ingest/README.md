# sign-ingest

Reference implementation for converting unstructured documents into valid [SIGN](https://github.com/sign-protocol/sign-lang) format.

## Mission

`sign-ingest` is the reference toolchain for converting unstructured source documents (policies, standards, ADRs, plans, glossaries, knowledge dumps) into valid SIGN documents that pass the validator and slot cleanly into a SIGN canon.

## Quick Start

```bash
# Convert a single document
sign-ingest convert document.md --doctype standard --out output.sign

# Batch conversion
sign-ingest batch ./docs --out ./sign-output --doctype-map config.yaml

# Interactive review
sign-ingest convert document.md --doctype standard --review

# Import an OKF bundle into SIGN skeletons (deterministic, Stage 1)
sign-ingest import okf ./finance-okf -o ./sign-skeletons --allow-typemap-fallback
```

## OKF import (Stage 1)

`import okf` is the deterministic OKF→SIGN skeletoniser (SIGN Tooling RFC §2). It is a pure
function of the bundle and **invents no governance** — it emits `@doc`/`@anchor`/`@def`/`@links`/
`@props`/`@xwalk` skeletons and never `@constraints`/`@infer`/`@cluster`/`@boundary`. Each concept
gets a provisional id (`prov:<bundle>.<slug>`), the non-authoritative `imported` status, an
`@anchor` to its OKF path, and an `@xwalk okf:… => …` provenance line. Markdown links resolve to
sibling provisional ids (unresolved ones are reported, never guessed); `index.md`/`log.md` are
skipped. Unmapped OKF types fall back to `ref`, are recorded in `import-report.json`, and fail the
run unless `--allow-typemap-fallback` is passed. Stage 2 (the `sign-draft` skill) reads each
skeleton plus the original prose and proposes reviewed governance.

## Status

**v0.1 (MVP)** - Implemented as a dependency-free Node CLI with deterministic extraction heuristics, validator-in-the-loop execution, drop reports, provenance reports, batch conversion, doctor, promote, and a Claude Code skill wrapper. See [SPEC.md](./SPEC.md) for the canonical specification.

## Core Features

- **Doctype extraction** with confidence scoring and source-span tracking
- **Validator-in-the-loop** using upstream `sign validate` with a local development fallback
- **Deterministic emitter** for reproducible output
- **Provenance tracking** from source spans to emitted SIGN
- **Drop reporting** - no silent content loss
- **Human review** with persisted review files
- **Batch processing** for document collections

## Doctype Handlers

| Doctype | Target | Status |
|---------|--------|--------|
| `standard` | specification documents | Implemented |
| `policy` | policy documents | Implemented |
| `adr` | architecture decision records | Implemented |
| `plan` | project/execution plans | Implemented |
| `glossary` | terminology definitions | Implemented |
| `reference` | semi-structured knowledge | Implemented |

## Output Files

Per document conversion:
- `<id>.sign` - The SIGN document
- `<id>.drop.json` - Unplaced source spans with reason codes
- `<id>.prov.json` - Provenance mapping (source → emitted blocks)
- `<id>.review.json` - Manual edits from review (persists across runs)

## Documentation

- [SPEC.md](./SPEC.md) - Complete specification
- [schemas/](./schemas/) - IR and ontology schemas
- [src/handlers/](./src/handlers/) - Handler prompts, schemas, and notes

## Development

```bash
npm install
npm test
npm run build
npm run eval
```

## Integration with SIGN-LANG

`sign-ingest` is one producer of the SIGN contract. It depends on the SIGN spec but versions independently.

- Requires: `sign validate` command from upstream SIGN toolchain
- Emits: Valid `.sign` files per SIGN spec

## Related

- [SIGN-LANG](https://github.com/sign-protocol/sign-lang) - The spec
- [sign-tools](../../README.md) - Parent toolbox
