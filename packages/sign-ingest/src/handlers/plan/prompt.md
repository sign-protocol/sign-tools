# plan Handler Prompt

Extract execution plans into SIGN `pln` structure.

- Capture `[done]`, `[next]`, and `[later]` phase lines as `@phases`.
- Capture delivery commitments as `@rules`.
- Preserve source spans and drop unplaced planning prose.

