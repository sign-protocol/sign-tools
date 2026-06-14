# Sign Tools Project Brief

## Product name
Sign Tools — SIGN-LANG Toolbox

## One-sentence description
A monorepo of reference implementations and utilities supporting the SIGN-LANG open-source project for agent-oriented knowledge representation.

## Problem statement
SIGN-LANG (Sigil Intelligence Graph Notation) is a powerful notation for declaring structured knowledge to agents, but lacks a cohesive ecosystem of reference tools, converters, and utilities. Teams building SIGN-based systems need standardized implementations they can trust and extend.

## Users and buyers
- SIGN-LANG adopters building knowledge systems
- Knowledge engineers converting legacy documentation
- Agent framework developers integrating SIGN
- Open-source contributors extending SIGN tooling

## Outcomes
- Reference implementations developers can fork and adapt
- Proven patterns for document-to-SIGN conversion
- Validated tools reducing time-to-value for SIGN adoption
- Community hub for SIGN-LANG tooling

## Success metrics
- ✅ First tool (sign-ingest) meets v1.0 quality thresholds
- N tools in active use by SIGN-LANG community
- Adoption by major agent frameworks
- Contributor engagement and extensions

## Constraints
- Tools must emit valid SIGN per specification
- Reference implementations must be production-quality
- Tools should integrate cleanly with agent ecosystems
- Documentation must be comprehensive

## Non-goals
- SIGN specification changes (upstream concern)
- Production hosting or cloud services
- Commercial product support
- Custom integrations beyond reference implementations

## Risks
- SIGN-LANG specification evolution
- Tool adoption barriers
- Maintenance burden across multiple tools
- Community fragmentation

## Initial release strategy
- Phase 1: sign-ingest with standard doctype
- Community pilot and feedback
- Phase 2: Additional doctypes and tools
- Ecosystem publication and documentation

## Open questions
- Monorepo vs. multi-repo strategy?
- Shared code/utilities organization?
- Tool versioning vs. monorepo versioning?
- Community contribution workflows?

## Architecture notes
- Monorepo structure: packages/{tool-name}/
- Shared utilities in shared/ directory
- Repo-wide agentic OS coordinating development
- Language-agnostic tool design

## Operating notes
- Each tool self-contained with own README, SPEC, tests
- Shared CI/CD for validation and publishing
- Community-driven roadmap
- Regular sync with upstream SIGN-LANG project