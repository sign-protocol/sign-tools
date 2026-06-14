# AGENTS.md — Sign Tools Toolbox

This repository is a monorepo for tools supporting the [SIGN-LANG](https://github.com/sign-notation/sign-lang) project. It uses an agentic development operating system to enable AI-assisted implementation while maintaining human control over strategy and risk.

## Repository Purpose

**Sign Tools** is a curated collection of reference implementations for the SIGN-LANG ecosystem:
- Document converters (sign-ingest)
- Utilities and integrations (TBD)
- Shared code and schemas

Each tool is independently versioned, tested, and documented but shares repo-wide coordination.

## Start Here
Read these files in order:
1. `README.md` - Repository overview
2. `.agent/SOUL.md` - Engineering posture
3. `.agent/policies/approvals.md` - Approval boundaries
4. `.agent/policies/agent-coding-standards.md` - Code standards
5. `.agent/operating-system/README.md` - Operating system
6. `.agent/operating-system/product/project-brief.md` - Current mission

## Tool Onboarding

For **tool authors** adding a new tool to the toolbox:
1. Create `packages/<tool-name>/` directory
2. Create tool-specific README and SPECIFICATION
3. Follow repo-wide coding standards
4. Implement tool-specific tests and validation
5. Document in root README.md

For **contributors** to existing tools:
1. Find the tool in `packages/`
2. Follow its README and SPECIFICATION
3. Refer to repo-wide policies for standards and approvals
4. Create tool-specific plans if needed in `.agent/operating-system/plans/`

## Core Workflow
1. Understand the request, constraints, and risk tier
2. Check `.agent/operating-system/product/project-brief.md` for repo intent
3. Create or update a plan in `.agent/operating-system/plans/` for material work
4. Request approval before any approval-boundary action
5. Implement in small, verifiable increments
6. Keep decisions and documentation synchronized with implementation
7. Store durable evidence when work benefits from traceability

## Mandatory Artifacts
- ADRs live in `.agent/operating-system/decisions/`
- Plans live in `.agent/operating-system/plans/active`, `backlog`, or `historical`
- Durable repo-wide standards live under `.agent/policies/`
- Tool-specific decisions go in `packages/<tool>/decisions/` (optional)

## Approval Boundaries
Stop and request human approval before:
- Destructive data changes or irreversible migrations
- Changes to secrets, identity, auth, or permission boundaries
- Production configuration or infrastructure changes
- Public exposure of new endpoints or integrations
- Changes that weaken security controls

## Footprint Rule
- Keep the root light. Place repo-wide coordination in `.agent/operating-system/`
- Keep tool-specific code in `packages/<tool>/`
- Shared utilities go in `shared/`
- Document coordination and tool listings in root README.md and this file

## Monorepo Principles
- Each tool is independently functional and testable
- Shared code lives in `shared/` with clear contracts
- Tools can have different languages if justified
- Versioning: tools version independently; root publishes as a collection

