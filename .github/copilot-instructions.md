# GitHub Copilot Instructions for Sign Tools

This is a monorepo for tools supporting the [SIGN-LANG](https://github.com/sign-protocol/sign-lang) open-source project. As Copilot/Codex, adhere to these guidelines:

## Repository Purpose
- **Mission**: Provide reference implementations for SIGN-LANG ecosystem
- **Structure**: Monorepo with `packages/<tool>/` for each tool
- **First Tool**: sign-ingest (document → SIGN converter)
- **Shared Code**: `shared/` for cross-tool utilities

## Engineering Posture
- Be truthful and explicit
- Create durable artifacts
- Prioritize maintainability
- Use clear boundaries and small steps

## Development Workflow
1. Review request, constraints, and risk level
2. Consult `.agent/operating-system/product/README.md` for repo intent
3. For tool-specific work, read `packages/<tool>/SPEC.md` first
4. For significant work, create/update plans in `.agent/operating-system/plans/`
5. Seek approval for high-risk actions
6. Implement incrementally with verification
7. Keep docs synchronized with code changes

## Standards and Policies
- Follow `.agent/policies/agent-coding-standards.md`
- Review approval boundaries: `.agent/policies/approvals.md`
- Consider risk tiers: `.agent/policies/risk-tiers.md`

## Approval Requirements
Request human approval for:
- Irreversible data changes
- Security/auth modifications
- Production infrastructure changes
- New public integrations
- Security weakening changes

## Documentation Updates
Documentation is part of the product. Update when system truth changes:
- Tool-specific changes: `packages/<tool>/` docs
- Shared changes: `shared/`, `docs/`, repo README
- Decisions: `.agent/operating-system/decisions/`

## Repository Structure
```
sign-tools/
├── .agent/               # Agentic OS (policies, plans, decisions)
├── packages/
│   └── sign-ingest/     # First tool
├── shared/              # Shared utilities
├── docs/                # Shared documentation
└── AGENTS.md, README.md, CONTRIBUTING.md
```

## For Adding a New Tool
1. Create `packages/<tool-name>/` with README and SPEC.md
2. Follow existing tool patterns
3. Update root README.md with tool description
4. Create implementation plan if substantial
5. Ensure code passes repo standards</content>
<parameter name="filePath">c:\CareerHighways\sign-tools\.github\copilot-instructions.md