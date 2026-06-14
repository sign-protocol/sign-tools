# Execution Examples

Use these examples to reinforce the harness execution discipline.

## Think Before Coding

Anti-pattern:
- silently picking one interpretation of an ambiguous request and implementing it

Preferred behavior:
- name the competing interpretations
- state which repository facts are verified
- ask for clarification when the ambiguity changes scope, safety, or user outcome

## Simplicity First

Anti-pattern:
- introducing abstractions, configuration, or extensibility for a one-off change

Preferred behavior:
- implement the minimum code that solves the current request
- defer generalization until multiple concrete use cases exist

## Surgical Changes

Anti-pattern:
- fixing a bug while also reformatting nearby code, rewriting comments, or refactoring unrelated logic

Preferred behavior:
- change only the lines needed for the requested behavior, required tests, and affected docs
- mention unrelated cleanup opportunities without performing them unless asked

## Goal-Driven Execution

Anti-pattern:
- "review code and make it work"

Preferred behavior:
- define a failing test, eval, or observable check
- implement the smallest change that makes the check pass
- verify existing behavior still holds

## Review Questions

- What exact behavior proves the task is done?
- Which assumptions were verified in the repo and which remain assumptions?
- Is any part of the diff solving a problem the user did not ask to solve?
- Would a simpler implementation satisfy the same success criteria?
