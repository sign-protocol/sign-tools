# sign-ingest

Use this skill when an operator asks Claude Code to convert source documents into SIGN using this repository's `sign-ingest` CLI.

## Workflow

1. Identify the source document and doctype.
   - Use front matter or filename if clear.
   - Ask for the doctype when it is not inferable.
2. Confirm the ontology config.
   - Use `--ontology <path>` when the target canon has governed prefixes and predicates.
   - If no ontology is supplied, run in freeform mode and expect `@vocab` definitions for emitted predicates.
3. Invoke the CLI:

   ```bash
   sign-ingest convert <input> --doctype <type> --out <path> [--ontology <path>] [--review]
   ```

4. Never bypass validation.
   - If validation fails, surface the validator errors verbatim and stop.
   - Do not manually edit SIGN to paper over validator output without operator approval.
5. Walk the operator through:
   - `<id>.drop.json`
   - `<id>.prov.json`
   - optional `<id>.review.json`

## Doctypes

Use `policy`, `standard`, `adr`, `plan`, `glossary`, or `reference`.

See `references/doctype-cheatsheet.md` and `references/ontology-config-format.md`.

