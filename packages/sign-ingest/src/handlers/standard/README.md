# standard Handler

Captures structured standards and specifications. The deterministic MVP extracts:

- `@def` from the first descriptive paragraph
- `@props` from property or field sections
- `@include` and `@exclude` from matching sections
- `@rules` from rules, requirements, policy, or standard sections
- `@constraints` from constraint sections
- `@attrs` from required and optional attribute sections
- `@rel` and `@edges` from explicit `subject predicate target` lines using allowed predicates

Unplaced spans are written to the drop report.

