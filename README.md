# Travel Tools Shop

A production-oriented travel/camping/outdoor store MVP for Persian-speaking customers, built as a maintainable Spring Boot learning and public portfolio project. See `PROJECT.md` for the domain contract and delivery phases, and `CLAUDE.md` for engineering conventions.

**Status:** Phase 1 (Foundation) — repository, applications, database, and testing infrastructure only. No product/cart/checkout/admin features yet.

## Architecture and stack

Monorepo with two independently runnable applications:

- `backend/travelTools` — Java 21, Spring Boot 4, Spring Web (MVC), Spring Data JPA, Bean Validation, Flyway, PostgreSQL, Maven.
- `frontend` — Next.js (App Router), React, strict TypeScript, Tailwind CSS.

Local infrastructure (PostgreSQL) runs via Docker Compose; both applications run directly on the developer machine.

## Prerequisites

- Java 21
- Node.js 20+ and npm
- Docker (with Compose) for local PostgreSQL and for backend integration tests (Testcontainers)

## Configuration

The backend reads its database connection from environment variables, with local-friendly defaults matching Docker Compose:

| Variable | Default |
| --- | --- |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `travel_tools` |
| `DB_USER` | `travel_tools` |
| `DB_PASSWORD` | `travel_tools` |

Copy `.env.example` to `.env` at the repository root and adjust values if needed; `.env` is used by Docker Compose and is git-ignored.

```bash
cp .env.example .env
```

## Local database (Docker Compose)

Starts a single PostgreSQL 18 container:

```bash
docker compose up -d
```

Stop it with `docker compose down` (add `-v` to also drop the data volume).

## Backend

```bash
cd backend/travelTools
./mvnw spring-boot:run
```

Schema is managed exclusively by Flyway migrations under `src/main/resources/db/migration` (none yet — no domain tables exist in this phase).

### Backend tests

```bash
cd backend/travelTools
./mvnw test
```

Integration tests boot the full Spring context against a real, ephemeral PostgreSQL container via Testcontainers (`@ServiceConnection`) — no H2 substitution. Docker must be running.

### Backend build

```bash
cd backend/travelTools
./mvnw clean verify
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

### Frontend tests

```bash
cd frontend
npm run test
```

Uses Vitest and React Testing Library.

### Frontend lint, type-check, and build

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

## API documentation

Not yet published. OpenAPI/Swagger documentation will be added alongside the first public API (Phase 2 — Product/Variant/Category).
