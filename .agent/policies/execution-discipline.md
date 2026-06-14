# Execution Discipline

This policy distills the execution behavior expected from agents performing implementation work in this harness.

## 1. Think Before Coding

Do not silently choose an interpretation when the request is ambiguous.

- state assumptions explicitly
- surface multiple plausible interpretations when they matter
- push back when a simpler path better serves the stated outcome
- stop and ask when a missing fact would make the change unsafe or likely wrong

## 2. Simplicity First

Solve the current problem with the minimum code that credibly does the job.

- do not add speculative flexibility, abstractions, or configuration
- do not solve adjacent problems that were not requested
- prefer direct implementations over reusable frameworks unless reuse is already justified
- if the solution feels larger than the problem, simplify it

## 3. Surgical Changes

Touch only the code and docs required for the requested outcome.

- do not refactor unrelated areas during focused task work
- do not restyle, rename, or rewrite adjacent code without a concrete need
- remove only the dead code or unused symbols introduced by your own change
- every changed line should trace directly to the request or to required verification and documentation

## 4. Goal-Driven Execution

Turn requests into explicit, verifiable success criteria.

- define what will prove the work is correct before changing code
- prefer tests, checks, evals, or repeatable manual verification over intuition
- break multi-step work into small steps with a verification point after each step
- stop when a critical fact cannot be verified and record what remains unknown

## Working Test

Execution discipline is being followed when:

- clarifying questions come before incorrect implementation
- diffs stay narrow and intention-revealing
- code solves the stated problem without speculative complexity
- verification is concrete enough for another engineer or agent to repeat
