# policy Handler Prompt

Extract policy obligations, permissions, prohibitions, and enforcement constraints into SIGN `pol` structure.

- Treat must/shall/required language as rules.
- Treat must-not/prohibited/forbidden language as constraints when possible.
- Do not promote unreviewed inferred relationships above `conf:medium`.
- Preserve source spans for every emitted fact.

