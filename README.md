# Sign Tools

**A toolbox of reference implementations and utilities for the [SIGN-LANG](https://github.com/sign-protocol/sign-lang) open-source project.**

**New to SIGN? Start at [sign-protocol.github.io/sign-lang](https://sign-protocol.github.io/sign-lang/?utm_source=github-sign-tools-readme&utm_medium=referral&utm_campaign=sign-open-source&utm_content=site-link-top)**: a guide for engineers and one for teams, including a note for your security team before you run these tools.

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
│   ├── sign-encode-repo/        # Codebase → SIGN canon (v0.1)
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

### sign-encode-repo (v0.1)
Claude Code skill that walks a whole code repository and generates its SIGN engineering canon under
`.agent/sign/`: four machine-drafted documents (OVERVIEW, ARCH, DEPS, STANDARDS), a compiled
Layer 1 index and Layer 2 bundle, a coverage report, and a delimited SIGN block in `AGENTS.md` /
`CLAUDE.md`, so an agent orients from the canon instead of reading the tree.

- **Skill**: [SKILL.md](packages/sign-encode-repo/.claude/skills/sign-encode-repo/SKILL.md)
- **README**: [packages/sign-encode-repo/README.md](packages/sign-encode-repo/README.md)

`sign-encode-repo` runs against source you may regard as your most valuable IP. Its SKILL.md opens with
an explicit operating contract (bounded writes, no source mutation, no network egress, a mandatory
secret-redaction pass, pointers rather than pasted code, honest provenance) and
`references/safety.md` holds the detail. Read it before you run the skill.

## SIGN in Charter

Charter, from Five Deep, delivers a company's knowledge and rules to its agents in SIGN. Charter requires the area owner's approval. A document the owner adds is approved as it's added. Anyone else's waits for the owner.

[Test Drive Charter](https://charter.fivedeep.ai/?utm_source=github-sign-tools-readme&utm_medium=referral&utm_campaign=sign-open-source&utm_content=test-drive), free for 30 days.

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
