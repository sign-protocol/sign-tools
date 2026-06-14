# glossary Handler Prompt

Extract term definitions into SIGN `gls` structure.

- Treat `Term: definition`, `Term | definition`, and bullet variants as term definitions.
- Capture aliases as crosswalks when explicitly stated.
- Preserve source spans for each definition.

