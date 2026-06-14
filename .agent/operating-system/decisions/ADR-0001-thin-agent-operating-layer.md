# ADR-0001 - Thin Agent Operating Layer

Status: Accepted
Date: 2026-03-12

## Context
This starter is intended to be dropped into an existing repository without imposing a large top-level documentation or directory footprint.

## Decision
Keep the root limited to `AGENTS.md` and `README.md`. Place reusable agent policies, prompts, rubrics, schemas, product templates, plans, and ADRs under `.agent/`.

## Alternatives considered
- Put governance, product, and planning files at the repo root.
- Split every concern into broad top-level directories from day one.

## Consequences
- the starter stays easy to embed in existing repositories
- agent operating artifacts remain discoverable in one subtree
- host repositories can add code, infra, tests, and runbooks only when needed

## Related docs
- `.agent/operating-system/README.md`
- `AGENTS.md`

## Supersedes / superseded by
None.
