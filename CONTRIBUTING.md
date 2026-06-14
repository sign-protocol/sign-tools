# Contributing to Sign Tools

## Before You Start

1. Read [AGENTS.md](../AGENTS.md) - This is the agentic OS that governs development
2. Understand the [project brief](../.agent/operating-system/product/project-brief.md)
3. Review the relevant tool's SPEC.md in `packages/<tool>/`

## Adding a New Tool

1. **Create directory structure**:
   ```
   packages/<tool-name>/
   ├── README.md
   ├── SPEC.md
   ├── src/
   ├── schemas/
   ├── evals/
   ├── decisions/
   └── .claude/
   ```

2. **Document the tool**:
   - README.md: Quick start, features, status
   - SPEC.md: Complete specification
   - Tool-specific DEVELOPMENT.md if needed

3. **Follow standards**:
   - Code standards: `.agent/policies/agent-coding-standards.md`
   - Approval boundaries: `.agent/policies/approvals.md`
   - Risk tiers: `.agent/policies/risk-tiers.md`

4. **Create a plan**:
   - Add to `.agent/operating-system/plans/active/` if substantial
   - Link from root README.md

5. **Implement incrementally**:
   - Small, verifiable changes
   - Frequent validation against spec
   - Keep documentation in sync

## Code Review

- All changes should align with the agentic workflow
- Tests and evals must pass
- Documentation must be current
- Architecture decisions should be documented as ADRs

## Shared Code

When adding to `shared/`:
- Ensure no circular dependencies
- Test across all consuming tools
- Document the interface clearly
- Consider versioning implications

## Questions?

Consult:
- Tool-specific README and SPEC.md
- Repo-wide policies in `.agent/policies/`
- Existing plans in `.agent/operating-system/plans/`
