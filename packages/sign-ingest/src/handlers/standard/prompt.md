# standard Handler Prompt

Extract normative specification content into SIGN `std` structure.

- Prefer direct statements over inferred relationships.
- Capture definitions, core properties, inclusion and exclusion criteria, constraints, relationship declarations, and required/optional attributes.
- Mark inferred edges as `conf:medium`, `status:proposed`, and `type:inferred`.
- Preserve source spans for every emitted fact.

