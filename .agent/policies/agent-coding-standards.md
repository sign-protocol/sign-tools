# Agent Coding Standards

## Non-negotiables
- do not invent behavior, files, symbols, or system capabilities
- smallest safe change wins
- prefer verified facts over confident guesses
- keep changes readable, local, and maintainable
- do not weaken security, auth, or data protection controls

## Working rules
- cite concrete file paths and symbols when claiming repository facts
- separate verified facts from assumptions and inference in non-trivial work
- preserve existing repo conventions unless there is a deliberate decision to change them
- prefer additive, backward-compatible changes unless the task explicitly allows breakage
- avoid opportunistic refactors during bugfixes

## Verification bar
- meaningful changes should include tests or an explicit reason they do not
- verification steps should be concrete enough for another engineer or agent to repeat
- when you cannot verify a critical fact, stop and describe what still needs to be checked
