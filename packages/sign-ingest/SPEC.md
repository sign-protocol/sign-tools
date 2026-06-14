# sign-ingest Specification v0.1

> Status: **MVP** — Adopted as canonical specification for sign-ingest tool.
> Part of the [sign-tools](../../) toolbox for SIGN-LANG ecosystem.

## 1. Mission

`sign-ingest` is the reference toolchain for converting unstructured source
documents (policies, standards, ADRs, plans, glossaries, knowledge dumps) into
valid SIGN documents that pass the validator and slot cleanly into a SIGN
canon.

The SIGN spec defines the **contract**. `sign-ingest` is one **producer** of
that contract. Other producers may exist; they need only emit conformant SIGN
and pass `sign validate`.

## 2. Scope

### In scope
- CLI for one-shot and batch document conversion.
- A Claude Code Skill (`sign-ingest`) that wraps the CLI for interactive use.
- Doctype handlers: `policy`, `standard`, `adr`, `plan`, `glossary`, `reference`.
- LLM-driven extraction with deterministic post-processing.
- Validator-in-the-loop: emitted SIGN must pass `sign validate` before exit.
- Provenance: every extracted edge, rule, or definition carries `src:` back to
  a span in the source document.
- Drop report: every input span the converter could not place in SIGN is
  reported, never silently discarded.

### Out of scope
- Defining or extending the SIGN sigil set — spec changes belong upstream.
- Hosting, storage, or graph-database loading — downstream of compile.
- Authoring UX beyond the CLI/Skill — IDE plugins are a separate concern.
- Domain ontologies (skills, roles, competencies) — supplied by the consumer
  as configuration, not baked into the tool.

## 3. Versioning relationship to SIGN spec

- `sign-ingest` declares a **minimum supported SIGN spec version** in its
  manifest (e.g. `sign-spec: ">=1.0,<2.0"`).
- `sign-ingest` version is independent. Tooling iterates faster than spec.
- Breaking changes in SIGN bump the supported range; tooling churn does not
  affect spec consumers.

## 4. Architecture

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│  Source doc  │ -> │  Doctype handler │ -> │ SIGN emitter │
│ (.md/.docx/  │    │ (extract → IR)   │    │ (IR → .sign) │
│  .pdf/.txt)  │    └──────────────────┘    └──────┬───────┘
└──────────────┘            ^                       │
                            │                       v
                     ┌──────┴──────┐         ┌──────────────┐
                     │  Ontology   │         │ sign validate│
                     │  config     │         │ (in-loop)    │
                     └─────────────┘         └──────┬───────┘
                                                    │ pass
                                                    v
                                             ┌──────────────┐
                                             │  out.sign    │
                                             │  + drop.json │
                                             │  + prov.json │
                                             └──────────────┘
```

Three stages, each independently testable:

1. **Doctype handler** — parses source, extracts a typed intermediate
   representation (IR) of claims, definitions, constraints, edges. LLM-driven,
   prompted with doctype-specific guidance.
2. **SIGN emitter** — pure function from IR → SIGN text. Deterministic.
   No LLM. Enforces block order, sigil syntax, namespace prefixing.
3. **Validator-in-the-loop** — runs the upstream `sign validate` against
   emitted output. On failure, errors are fed back to the doctype handler for
   one (and only one) repair pass. Persistent failure exits non-zero.

## 5. CLI

```
sign-ingest convert <input> [--doctype TYPE] [--out PATH]
                            [--ontology PATH] [--review]

sign-ingest batch <input-dir> --out <out-dir>
                              [--doctype-map PATH]
                              [--ontology PATH]

sign-ingest doctor <out.sign>
  # Re-runs validator and prints the drop report against the source doc.
```

### Required flags / config
- `--doctype` — one of the registered handlers; required if not inferable
  from filename or front-matter.
- `--ontology` — path to a YAML/JSON file declaring allowed namespace
  prefixes, vocab predicates, and document ID conventions for the target
  canon. Without it, the tool runs in **freeform** mode (vocab inferred,
  flagged for review).

### Required outputs (per converted document)
- `<id>.sign` — the SIGN document itself.
- `<id>.drop.json` — every source span the tool could not place, with reason
  codes (`out-of-scope`, `ambiguous`, `low-confidence`, `unsupported-doctype`).
- `<id>.prov.json` — for every emitted block, the source span(s) that
  produced it. Enables round-trip review.

## 6. Conversion contract

A successful `convert` invocation **MUST**:

1. Produce SIGN that passes `sign validate` against the declared spec version.
2. Emit a `@doc` line with non-empty `id`, `type`, `status`, and `audiences`.
3. Use only namespace prefixes and predicates declared in the supplied
   ontology, OR (in freeform mode) emit a `@vocab` block defining every
   predicate it uses.
4. Carry `src:` provenance on every `@edges` row and every `@infer` rule.
5. Never silently drop source content. Every dropped span appears in the drop
   report with a reason code.
6. Be deterministic in the emitter stage: identical IR + identical emitter
   version → byte-identical SIGN.

A successful `convert` invocation **MUST NOT**:

- Invent canonical IDs not present in the ontology unless `--coin-ids` is
  explicitly set. Default behavior on unknown referents is to emit a
  `customer:` or `legacy:` namespaced placeholder and add an `@xwalk` row.
- Emit edges with `conf:high` for LLM-inferred relations. The maximum
  confidence for an unreviewed inferred edge is `medium`, with
  `status:proposed` and `type:inferred`.
- Modify the upstream SIGN validator binary or vendored grammar.

## 7. Doctype handlers

Each handler is a directory under `handlers/<doctype>/` containing:

```
handlers/policy/
  prompt.md              # extraction guidance for this doctype
  ir-schema.json         # JSON schema for the IR this handler emits
  examples/              # source → IR → SIGN triples for evals
  README.md              # what this handler captures and what it drops
```

### v0.1 target handlers

| Doctype | SIGN `type` | Primary blocks emitted | Notes |
|---|---|---|---|
| `policy` | `pol` | `@def`, `@include`, `@exclude`, `@rules`, `@constraints` | Captures must/may/shall language as `@rules` |
| `standard` | `std` | `@def`, `@props`, `@rel`, `@attrs`, `@disallowed` | Strongest fit for structured spec docs |
| `adr` | `adr` | `@def`, `@rules`, `@status`, `@links` | Lossy for prose context — review expected |
| `plan` | `pln` | `@phases`, `@status`, `@links` | Phase tokens mapped from headings/dates |
| `glossary` | `gls` | `@def`, `@vocab`, `@xwalk` | One `@def` per term; aliases become `@xwalk` |
| `reference` | `ref` | `@def`, `@props`, `@rel` | Catch-all for semi-structured knowledge |

Adding a doctype is additive: it requires a handler directory, eval fixtures,
and a registration entry. It does not touch the SIGN spec.

## 8. Confidence & provenance model

Every IR fact carries:

- `confidence` ∈ `{low, medium, high}` — the handler's self-assessed
  certainty.
- `source-span` — file path + byte range (or page + line for PDF/docx).
- `extraction-method` ∈ `{direct, inferred, resolved}` — direct quote vs
  rule-derived vs cross-reference resolution.

These map to SIGN edge properties:

| IR field | SIGN property |
|---|---|
| `confidence` | `conf:` |
| `source-span` (file) | `src:` |
| `extraction-method=inferred` | `type:inferred`, `status:proposed` |
| `extraction-method=direct` | `type:asserted`, `status:validated` if reviewed |
| `extraction-method=resolved` | `type:inferred` + `rule:` ref |

## 9. Human review loop

Two modes:

- **`--review` (interactive)** — after emit, opens a side-by-side diff:
  source spans on the left, emitted SIGN on the right, drop report below.
  Operator can accept, reject, or edit each block. Accepted edits are
  persisted to a `<id>.review.json` so re-runs don't undo manual fixes.
- **batch mode** — no interactive prompt; all `type:inferred` edges land
  with `status:proposed`. A separate `sign-ingest promote <id>.sign` command
  walks proposed edges for explicit accept/reject after the fact.

Re-running `convert` on an already-reviewed document MUST preserve manual
edits unless `--force` is set.

## 10. Claude Code Skill

A `SKILL.md` ships with the repo so Claude Code agents can drive ingestion
conversationally:

```
.claude/skills/sign-ingest/
  SKILL.md
  references/
    doctype-cheatsheet.md
    ontology-config-format.md
```

The Skill's job is to:
1. Detect or ask for the doctype.
2. Confirm the target ontology config.
3. Invoke `sign-ingest convert` with appropriate flags.
4. Walk the operator through the drop report and review queue.
5. Never bypass the validator. If validation fails, surface the errors
   verbatim and stop — do not paper over with edits.

The Skill is a thin wrapper. All extraction logic lives in the CLI so
non-Claude consumers (CI pipelines, other agent frameworks) get the same
behavior.

## 11. Repository layout

```
sign-ingest/
  README.md
  SPEC.md                      # this document
  CHANGELOG.md
  package.json
  bin/
    sign-ingest                # CLI entry point
  src/
    cli/                       # argument parsing, batch orchestration
    handlers/                  # doctype handlers (see §7)
    emitter/                   # IR → SIGN, deterministic
    validator-bridge/          # shells out to upstream `sign validate`
    review/                    # interactive review UI
  schemas/
    ir.schema.json             # canonical IR schema across handlers
    ontology.schema.json       # ontology config format
  evals/
    fixtures/                  # source docs + expected SIGN
    runner.js                  # eval harness
  .claude/skills/sign-ingest/  # Claude Code skill
  decisions/                   # ADRs for tooling-level choices
```

## 12. Eval & quality bar

`sign-ingest` ships with a held-out eval set per doctype. Quality bar for
v1.0 release:

| Metric | Threshold |
|---|---|
| Validator pass rate (zero manual fixes) | ≥ 95% on eval set |
| Edge precision (sampled, SME-graded) | ≥ 0.85 |
| Edge recall vs. SME-authored ground truth | ≥ 0.70 |
| Drop-report completeness (no silent drops) | 100% |
| Emitter determinism (re-emit byte-identical) | 100% |

Recall is intentionally lower than precision — `sign-ingest` is allowed to
miss content (it surfaces in the drop report) but is not allowed to
fabricate.

## 13. Non-goals (explicitly)

- Not a graph database loader. Compiled `.sign` files are the handoff.
- Not a SIGN authoring IDE. Editor support lives in `sign-lang/editor-support`.
- Not a translation layer between SIGN and other graph formats (RDF, OWL,
  property graphs). That belongs in a separate `sign-export` companion.
- Not a vocabulary governance tool. Ontology config is consumed, not curated,
  by this tool.

## 14. Open questions

- **Language choice.** Node (matches validator) vs. Python (matches typical
  ML/extraction tooling). Leaning Node for toolchain coherence, but the
  doctype handlers are LLM-driven so language barely matters there.
- **LLM provider abstraction.** Bake in Anthropic SDK, or define a thin
  provider interface? Recommend the latter for portability.
- **PDF/docx extraction quality.** Likely needs a pluggable text-extraction
  layer (pdfminer, mammoth, etc.) since fidelity here dominates downstream
  quality.
- **Ontology config format.** YAML for human edit, JSON for machine. Pick
  one and convert at boundaries.

## 15. Next steps

1. ✅ Adopt spec in sign-ingest repo
2. ✅ Set up repository layout
3. Build the `standard` doctype handler first — best signal-to-noise for
   eval, lowest ambiguity in source docs.
4. Wire validator-in-the-loop end-to-end before adding more handlers.
5. Ship the Claude Code Skill once the CLI is stable.
