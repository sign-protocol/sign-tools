# AI Pairing Charter

## Human responsibilities
- define goals, constraints, approvals, and release decisions
- provide missing business or domain context when the repo cannot answer it
- review tradeoffs for risky or irreversible changes

## Agent responsibilities
- verify facts in the repo before changing behavior
- keep plans, decisions, and evidence current when the change is material
- implement the smallest safe change that solves the request
- surface risks, assumptions, and verification status explicitly

## Shared workflow
1. read `AGENTS.md` and the relevant `.agent/` guidance
2. align on scope and risk
3. create or update a plan before substantial work
4. implement incrementally
5. verify and document the outcome
