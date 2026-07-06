---
name: sign-draft
description: >
  Author a new SIGN document from a concept, notes, or requirements — interactively and
  spec-compliant. Use when an operator asks Claude Code to write, draft, or create a SIGN
  document (a std / pol / ref / proc / xwalk doc), produce a Layer 1 index entry, or hand-write
  SIGN structure. For converting an EXISTING source file into SIGN, use sign-ingest instead.
---

# sign-draft

Use this skill when an operator asks Claude Code to **author a new SIGN document** — turning a
concept, requirements, notes, or a spoken description into a valid SIGN Layer 2 document plus its
Layer 1 index entry.

This is the authoring counterpart to `sign-ingest`. `sign-ingest` programmatically converts an
existing source document via CLI; `sign-draft` writes SIGN from intent, guided by the spec.

## Authority

The authoritative sigil vocabulary, syntax, operators, and governance rules live in
[`references/sign-spec.md`](references/sign-spec.md). **Load it before drafting** and treat it as
normative. When in doubt, defer to the canonical spec in the `sign-lang` repository
(`spec/sign-v1.0.md`, `spec/sigil-reference.md`) — never invent sigils or syntax.

## Workflow

1. **Establish document identity.** Determine, asking the operator when not inferable:
   - `<ID>` — canonical document identifier
   - type token — `std` | `pol` | `ref` | `proc` | `xwalk`
   - status — `active` | `draft` | `deprecated` | `review-pending` (default new drafts to `draft`)
   - audience — `agents` | `employees` | `agents+employees`

2. **Draft the Layer 2 document** in canonical block order, per the spec. Typical order:
   `@doc` → `@links` → `@cycle` / `@reviewed` → `@vocab` → `@def` → `@include` / `@exclude` →
   `@props` → `@rules` → `@constraints` → `@infer` → `@cluster` → `@rel` / `@edges` → `@xwalk` → `@attrs`.
   - Write `@def` as continuous prose, one primary definition — not bullets.
   - `@vocab` is **required** whenever `@rel` or `@edges` are present: define every predicate used.
   - Use the correct relationship operators: `->` outbound, `<-` inbound, `<=>` symmetric
     (only for genuinely symmetric predicates), `=>` crosswalk resolution.

3. **Apply provenance discipline.** Every fact carries a provenance type:
   - `type:asserted` — validated by a human authority. Authoritative.
   - `type:inferred` — derived by rule/model. Must be tagged; cannot be promoted without human review.
   - `type:estimated` — model-estimated; must carry a confidence score.
   - LLM-derived facts use `confidence: derived` or `estimated` and **must not** be promoted to
     `asserted` without a human reviewer in `src:`.
   - **Codebase canon (the `*-ARCH`/`*-DEPS`/`*-OVERVIEW`/`*-STANDARDS` pattern):** the descriptive
     prose (`@def`/`@rules`/`@boundary`/`@props`/`@constraints`) is an LLM's reading of the code —
     `src:llm-extraction` — and must **never** be marked `type:asserted`. Only mechanically-verified
     `@edges` extracted from `*.csproj` may (`[type:asserted, src:csproj]`). Mark every machine-drafted
     codebase document with the provisional `machine-drafted` landing-status token in its `@doc` bag
     (`[std, active, agents, machine-drafted]`); it is cleared only by a human landing step.

4. **Never fabricate integrity hashes.** Use `sha:pending` for any unregistered document. The real
   `sha:` is the SHA-256 of the compiled artifact, produced at compile time — never make one up.

5. **Generate the Layer 1 index entry** for the document: `@canon`, `@doc`, `@links`, and a single
   `##` agent-summary line (~10 tokens). Every document must have both layers.

6. **Validate before declaring done.** Run the `sign-lang` validator/compiler against the draft:

   ```bash
   sign compile --source <dir> --output <dir>
   # or validate a single file with the sign-lang validator CLI
   ```

   - Surface validator errors **verbatim** and fix the SIGN, not the validator.
   - Do not paper over validation failures or hand-edit to suppress errors without operator approval.

7. **Respect governance boundaries.**
   - Do **not** generate `@reserved` blocks — those require deliberate human roadmap judgment.
   - Do not introduce new sigils or new cluster types; those require a proposal in `sign-lang` first.
   - Changes to `@def`, `@include`, `@exclude`, `@rules`, `@rel`, `@constraints`, or `@infer` on an
     `active` document are breaking changes requiring a major version bump — flag this to the operator.
   - **Codebase-canon anchoring:** put an `@anchor` on `*-ARCH` (`+ src/<Project>.*/**`, excluding
     tests/bin/obj), `*-DEPS` (`+ **/*.csproj`, bag key `generated-from:csproj`), and `*-OVERVIEW`
     (entrypoints + `README.md`) — but **never** a spatial `@anchor` on `*-STANDARDS`. Emit cross-repo
     edges in registry-resolvable form `codebase.<slug>#<DOC-ID>`, not bare `repo:<name>` strings.
     `generated-from:` and `machine-drafted` are provisional — see
     `sign-lang/proposals/2026-07-codebase-canon-reinforcement.md`.

## Output

Deliver:
- the Layer 2 `.sign` document,
- its Layer 1 index entry, and
- the validator result (pass, or errors surfaced verbatim).

## Scope

- **Use sign-draft for:** authoring new SIGN from intent; hand-writing or revising SIGN structure;
  producing index entries.
- **Use sign-ingest for:** converting an existing policy/standard/ADR/plan/glossary/reference file
  into SIGN via the CLI.
