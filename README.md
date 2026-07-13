# Sign Tools

**A toolbox of reference implementations and utilities for the [SIGN-LANG](https://github.com/sign-protocol/sign-lang) open-source project.**

SIGN (Sigil Intelligence Graph Notation) is a strongly-typed, human-readable, token-optimized notation system for declaring knowledge to agents.

## Mission

Provide reference implementations of tools and skills that:
- Convert documents to SIGN format
- Validate and transform SIGN documents
- Enable agent-driven workflows with SIGN data
- Support the broader SIGN ecosystem

## Repository Structure

This is a monorepo housing multiple tools and skills:

```
sign-tools/
├── .agent/                       # Repo-wide agentic OS
├── docs/                         # Shared documentation
├── packages/                     # Tools and utilities
│   ├── sign-ingest/             # Document → SIGN converter (v0.1)
│   ├── sign-draft/              # Authoring skill: intent → SIGN (v0.1)
│   └── [future tools]
├── shared/                       # Shared code/utilities across tools
└── [Tool-specific examples]
```

## Tools in the Toolbox

### sign-ingest (v0.1)
Reference implementation for converting unstructured documents (policies, standards, ADRs, plans) into valid SIGN format with full provenance tracking and human review capabilities.

- **Spec**: [SPEC.md](packages/sign-ingest/SPEC.md)
- **Plan**: [Implementation Plan](.agent/operating-system/plans/active/sign-ingest-implementation-plan.md)

### sign-draft (v0.1)
Claude Code skill for authoring net-new SIGN documents from intent (a concept, notes, or requirements) — the generative counterpart to `sign-ingest`'s mechanical conversion. Spec-guided and validator-checked.

- **Skill**: [SKILL.md](packages/sign-draft/.claude/skills/sign-draft/SKILL.md)
- **README**: [packages/sign-draft/README.md](packages/sign-draft/README.md)

## Agentic Operating System

This repository follows AI-native development practices. See:
- [AGENTS.md](AGENTS.md) - Agent coordination guidelines
- [.agent/SOUL.md](.agent/SOUL.md) - Engineering posture
- [.agent/policies/](.agent/policies/) - Approvals, standards, risk tiers
- [.agent/operating-system/](.agent/operating-system/) - Plans, decisions, briefs

## Getting Started

1. Choose a tool from the toolbox
2. Follow its README and specification
3. Refer to the agentic workflow for integration guidance

## For Tool Authors

To add a new tool:
1. Create `packages/<tool-name>/` with README, SPEC, and implementation
2. Update this README with tool description
3. Create tool-specific plans in `.agent/operating-system/plans/` if needed
4. Ensure code follows `.agent/policies/agent-coding-standards.md`
