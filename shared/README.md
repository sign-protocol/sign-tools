# Shared Utilities

This directory contains code and utilities shared across sign-tools.

## Purpose

Shared utilities for:
- Text extraction and document parsing
- Common types and interfaces
- LLM provider abstraction
- SIGN emitter primitives
- Test fixtures and eval utilities

## Organization

Each shared module should:
- Have a clear, single responsibility
- Export well-documented interfaces
- Include TypeScript types where applicable
- Have unit tests in `__tests__/`

## Consumers

- `packages/sign-ingest/` and future tools
- Evaluated and extended as new tools are added

## Maintenance

Shared code changes require:
- Tests passing across all consumers
- Documentation updates
- Consideration for backward compatibility

Create a new top-level issue if a change affects multiple tools.
