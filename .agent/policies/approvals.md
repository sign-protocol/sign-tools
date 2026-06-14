# Approval Policy

## Autonomy allowed
Agents may usually perform without approval:
- create or update docs
- create or update plans
- write or refactor code within approved scope
- add tests
- improve local tooling
- improve observability within existing boundaries

## Approval required
Agents must stop and request approval before:
- destructive data changes
- schema drops or irreversible migrations
- changing permission boundaries
- exposing new public endpoints
- changing encryption, secrets, or identity models
- changing production deployment controls
