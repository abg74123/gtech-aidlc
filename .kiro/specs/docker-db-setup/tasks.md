# Implementation Plan: Docker Database Setup

## Overview

Implement a one-command database bootstrap experience via `scripts/db-setup.sh`. The script orchestrates Docker verification, environment configuration, container lifecycle, schema initialization, Prisma migrations, and seed data population. All changes target POSIX shell compatibility and use port 6432 to avoid conflicts with local PostgreSQL instances.

## Tasks

- [x] 1. Update docker-compose.yml and .env.example for port 6432
  - [x] 1.1 Update docker-compose.yml port mapping and health check configuration
    - Change port mapping default from `5432:5432` to `6432:5432`
    - Reduce health check interval from `10s` to `2s`
    - Increase retries from `5` to `30` (2s × 30 = 60s timeout window)
    - _Requirements: 3.2, 3.3_

  - [x] 1.2 Update .env.example with port 6432
    - Change `POSTGRES_PORT=5432` to `POSTGRES_PORT=6432`
    - Change `DATABASE_URL` to use port 6432: `postgresql://autoflow:autoflow_secret@localhost:6432/autoflow?schema=public`
    - _Requirements: 2.4_

- [x] 2. Create the setup script with prerequisite checks
  - [x] 2.1 Create `scripts/db-setup.sh` with shebang, set -e, and helper functions
    - Use `#!/bin/sh` shebang with POSIX-compatible syntax (no bash arrays, no `[[`, no `local`)
    - Define color/emoji output helpers for consistent messaging
    - Define `die()` function for error output to stderr and exit 1
    - Make the script executable (`chmod +x`)
    - _Requirements: 8.1, 6.3_

  - [x] 2.2 Implement `check_docker()` function
    - Verify `docker` CLI is on PATH using `command -v docker`
    - If missing, print error with Docker installation link and exit 1
    - Verify Docker daemon is responsive via `docker info` with timeout
    - If daemon not responsive, print error instructing to start Docker Desktop and exit 1
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.3 Implement `check_compose()` function
    - Try `docker compose version` first (V2 syntax)
    - If V2 unavailable, fall back to `docker-compose --version` (V1 syntax)
    - If neither available, print error with installation instructions and exit 1
    - Set `COMPOSE_CMD` variable for use in subsequent functions
    - _Requirements: 8.3, 8.4, 8.5_

  - [x] 2.4 Implement `ensure_env()` function
    - If `.env` exists, print info message and skip
    - If `.env` does not exist and `.env.example` exists, copy it and print message
    - If `.env` does not exist and `.env.example` is missing, print error to stderr and exit 1
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Implement container lifecycle and health check
  - [x] 3.1 Implement `start_container()` function
    - Execute `$COMPOSE_CMD up -d` to start services in detached mode
    - If container is already running, Docker Compose handles it gracefully (no-op)
    - _Requirements: 3.1, 3.5_

  - [x] 3.2 Implement `wait_for_healthy()` function
    - Poll container health status every 2 seconds using `docker inspect --format='{{.State.Health.Status}}'`
    - If healthy status reached, print success message and return 0
    - If 60 seconds elapsed without healthy, print timeout error with diagnostic commands (`docker logs`, `docker inspect`) and exit 1
    - Print informational message if container was already healthy
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint - Verify Docker integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement schema, migration, and seed execution
  - [x] 5.1 Implement `run_schemas()` function
    - Execute `scripts/init-schemas.sql` against the running container via `docker exec` + `psql`
    - SQL uses `CREATE SCHEMA IF NOT EXISTS` so it is idempotent
    - _Requirements: 4.1_

  - [x] 5.2 Implement `run_migrations()` function
    - Execute `npx prisma migrate dev --skip-generate` as a background process
    - Monitor with 120-second timeout; kill process if exceeded
    - On timeout, print error message and exit 1
    - On failure (non-zero exit), display migration error output and exit 1
    - On success with no pending migrations, print "already in sync" message
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [x] 5.3 Implement `run_seed()` function
    - Execute `npx tsx prisma/seed.ts`
    - On failure, display seed error output (stdout and stderr) and exit 1
    - On success, print confirmation message
    - Relies on upsert behavior in seed script for idempotency
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.4 Implement `print_summary()` function and main script orchestration
    - Display summary with database host, port 6432, database name, and command to start API (`npx nx serve api`)
    - Wire all functions together in the main execution flow: `check_docker` → `check_compose` → `ensure_env` → `start_container` → `wait_for_healthy` → `run_schemas` → `run_migrations` → `run_seed` → `print_summary`
    - Exit with code 0 on success
    - _Requirements: 6.1, 6.2, 7.2, 7.3, 7.4_

- [x] 6. Add npm scripts to package.json
  - [x] 6.1 Add `db:setup` and `db:reset` scripts to package.json
    - Add `"db:setup": "sh scripts/db-setup.sh"` to scripts section
    - Add `"db:reset": "docker compose down -v && sh scripts/db-setup.sh"` to scripts section
    - _Requirements: 7.1, 7.5, 7.6_

- [x] 7. Checkpoint - Full setup flow verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Add static analysis and unit tests
  - [ ]* 8.1 Add shellcheck smoke test
    - Create a test or CI step that runs `shellcheck -s sh scripts/db-setup.sh`
    - Verify zero errors or warnings for POSIX compliance
    - _Requirements: 8.1_

  - [ ]* 8.2 Create bats-core unit tests for shell functions
    - Create `scripts/db-setup.test.sh` with bats-core tests
    - Test `check_docker()` with mocked `command -v docker` returning failure
    - Test `check_docker()` with mocked `docker info` returning failure
    - Test `check_compose()` with V2 available, V1 fallback, and neither available
    - Test `ensure_env()` with .env existing, .env missing + example exists, and .env.example missing
    - Test `wait_for_healthy()` with mock returning "healthy" and mock timing out
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 8.3, 8.4, 8.5_

  - [ ]* 8.3 Create integration test file for db-setup
    - Create `tests/integration/db-setup.integration.test.ts` using Jest
    - Test fresh setup completes with exit 0
    - Test idempotent re-run (run twice, second succeeds without errors)
    - Test port 6432 connectivity after setup
    - Test that `.env` is preserved on re-run
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design explicitly states property-based testing does not apply to this feature (shell script orchestrating external tools)
- Unit tests use bats-core for shell function isolation
- Integration tests use Jest with actual Docker for end-to-end verification
- The script must use only POSIX `/bin/sh` constructs — verified by shellcheck

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2"] },
    { "id": 7, "tasks": ["5.3"] },
    { "id": 8, "tasks": ["5.4", "6.1"] },
    { "id": 9, "tasks": ["8.1", "8.2", "8.3"] }
  ]
}
```
