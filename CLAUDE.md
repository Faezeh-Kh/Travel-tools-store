# CLAUDE.md

Read PROJECT.md and relevant code before significant changes. Follow existing conventions.

## Working with the owner

This is a Spring Boot learning and portfolio project. Keep code understandable enough for the owner to maintain and
explain in interviews. Briefly explain significant concepts, tradeoffs, and why the chosen approach fits.

Before substantial work, give a short plan with affected files and risks. Resolve minor details yourself; pause to
discuss alternatives before consequential architecture, schema, security, public API, dependency, or infrastructure
changes.

## Change discipline

- Implement the requested phase incrementally. Avoid speculative features, abstractions, or infrastructure; justify
  dependencies against existing capabilities.
- Keep changes and proposed commits cohesive. Separate unrelated refactoring, upgrades, and formatting; explain
  necessary refactors and keep them minimal.
- Prefer straightforward, focused code and composition. Avoid redundant layers/interfaces, global mutable state, and
  patterns introduced only to demonstrate them.
- Never substitute placeholders, fake success, swallowed errors, or hardcoded production data for implementation. Report
  intentional gaps explicitly.

## Backend safeguards

- Keep business logic independent of HTTP and outside controllers. Use explicit DTOs and mappings; never accept or
  expose JPA entities through APIs.
- Follow REST methods/status codes. Centralize errors with timestamp, status, code, safe message, and applicable field
  errors; hide internal exceptions/database details.
- Manage schemas exclusively through Flyway; never change possibly applied migrations or use production schema
  auto-generation. Add appropriate keys, constraints, and indexes.
- Use BigDecimal for money. Review queries for N+1 behavior and avoid oversized responses.

## Security

Validate external input server-side. Use restricted request DTOs against mass assignment, parameterized queries against
injection, and deliberate CORS configuration. Fail safely; enforce admin authentication/authorization on the server.

Use Spring Security-supported adaptive password hashing when authentication is introduced. Supply secrets through
environment variables; never commit credentials or log passwords, authentication secrets, or unnecessary customer data.
Keep logging purposeful.

## Frontend safeguards

Keep code, REST paths, database names, and technical documentation in English. Enable strict TypeScript; justify
exceptional `any` usage.

Handle loading, empty, error, and appropriate success states. Use semantic controls, keyboard access, labeled forms, and
image alt text; avoid hover-only interactions. Visually check RTL navigation, icons, forms, prices, and spacing across
screen sizes. Lazy-load images where appropriate.

## Verification and completion

Every feature needs behavioral tests appropriate to its risks: business calculations/validation, persistence/services,
API success and failure cases, authorization, and critical UI interactions. Security-sensitive behavior requires tests.
Use PostgreSQL Testcontainers for persistence integration tests; H2 must not replace PostgreSQL-specific coverage.

For reproducible bugs, add and confirm a failing regression test before fixing when reasonable, then verify the fix and
related tests.

Run targeted tests, broader tests when practical, backend compilation, frontend build/type-check, and configured
lint/static checks. Never report unexecuted checks as passing; explain blocked verification.

Completion requires implemented requirements and edge cases, validation/error handling, passing checks, current
documentation, and no unexplained placeholders or obvious security issues. Keep README/OpenAPI synchronized; document
non-obvious contracts and decisions rather than narrating code.

End with a concise account of changes, tests, commands actually run/results, significant decisions, and remaining
issues. Do not claim completion when required checks remain unresolved.

## Question-only requests

When the user asks a conceptual question or requests an explanation without explicitly asking for implementation:

- Answer the question only.
- Do not modify files.
- Do not run commands, tests, builds, or applications.
- You may inspect/read relevant project files when necessary to answer accurately.
- Only implement changes when the user explicitly asks to modify, create, fix, or implement something.