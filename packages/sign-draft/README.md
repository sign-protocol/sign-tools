# sign-draft

A Claude Code skill for **authoring new [SIGN](https://github.com/sign-notation/sign-lang) documents from intent** — a concept, rough notes, or requirements — rather than converting an existing file.

## Mission

`sign-draft` is the authoring counterpart to [`sign-ingest`](../sign-ingest). Where `sign-ingest`
mechanically converts a finished source document into SIGN via CLI, `sign-draft` helps an operator
**compose a net-new SIGN document** when there is nothing to convert yet — the model does the
structuring and authoring judgment, guided by the spec, then validates the result.

It is a pure skill (no CLI underneath). It exists to demonstrate one of the many ways to use SIGN:
generative, spec-guided authoring.

## When to use which

| You have… | Use |
|---|---|
| A finished markdown/policy/standard/ADR/plan/glossary doc to convert | [`sign-ingest`](../sign-ingest) |
| A concept, rough notes, or requirements — no finished doc | **`sign-draft`** |

## What it does

- Establishes document identity (`<ID>`, type, status, audience).
- Drafts the Layer 2 document in canonical block order with correct sigil syntax and operators.
- Enforces provenance discipline (`asserted` / `inferred` / `estimated`) and never fabricates `sha:`.
- Generates the Layer 1 index entry.
- Validates with the upstream `sign` validator and surfaces errors verbatim.
- Respects governance boundaries (no inventing sigils, no auto `@reserved`, flags breaking changes).

## The skill

- [.claude/skills/sign-draft/SKILL.md](.claude/skills/sign-draft/SKILL.md) — the skill definition
- [.claude/skills/sign-draft/references/sign-spec.md](.claude/skills/sign-draft/references/sign-spec.md) — bundled authoritative sigil reference

## Keeping the reference in sync

The bundled reference at `.claude/skills/sign-draft/references/sign-spec.md` is a **synced copy** of
the canonical source in sign-lang: `spec/skill-reference.md`. Do not edit the bundled copy directly —
edit the canonical file in sign-lang, then re-sync.

```bash
# Copy the canonical sign-lang reference into the skill
npm run sync

# Verify the copy has not drifted (used by `npm test`; exits non-zero on drift)
npm run check-sync
```

The sync script finds your sign-lang checkout via the `SIGN_LANG_PATH` env var, falling back to the
sibling layout `<sign-tools>/../sign-lang`:

```bash
SIGN_LANG_PATH=/path/to/sign-lang npm run sync
```

Because the two repos version independently, sync is **deliberate, not automatic**: `npm test` flags
drift so you re-sync on purpose (ideally in CI) rather than silently picking up spec changes.

## Integration with SIGN-LANG

`sign-draft` depends on the SIGN spec but versions independently. Its bundled reference is synced from
the canonical `spec/skill-reference.md` in [SIGN-LANG](https://github.com/sign-notation/sign-lang);
the full `spec/sign-v1.0.md` remains the ultimate authority.

- Requires: `sign validate` command from the upstream SIGN toolchain
- Emits: Valid `.sign` documents and their Layer 1 index entries

## Related

- [SIGN-LANG](https://github.com/sign-notation/sign-lang) - The spec
- [sign-ingest](../sign-ingest) - Document → SIGN converter
- [sign-tools](../../README.md) - Parent toolbox
