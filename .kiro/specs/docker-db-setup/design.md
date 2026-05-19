# Design Document: Docker Database Setup

## Overview

This feature provides a single-command developer experience for bootstrapping the PostgreSQL database environment via Docker. The setup script (`scripts/db-setup.sh`) orchestrates the full lifecycle: verifying Docker prerequisites, ensuring environment configuration, starting the database container, running schema initialization and Prisma migrations, and populating seed data.

The script is designed for idempotent execution — developers can safely re-run it after pulling new changes, and it will only perform steps that are not yet satisfied. It targets macOS and Windows (via Docker Desktop) using POSIX-compatible shell syntax.

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| POSIX `/bin/sh` over Bash | Maximum portability across macOS, Linux, and WSL without requiring Bash installation |
| Port 6432 on host | Avoids conflicts with local PostgreSQL instances commonly running on 5432 |
| `docker compose` with V1 fallback | Supports both Docker Desktop (V2 built-in) and older standalone installations |
| Health check polling (2s interval, 60s timeout) | Balances responsiveness with tolerance for slow container starts on resource-constrained machines |
| Schema init via Docker entrypoint | Schemas are created automatically on first container start; script also runs them explicitly for existing containers |
| Upsert-based seeding | Prisma seed uses `upsert` pattern, making re-runs safe without duplicate data |

## Architecture

```mermaid
flowchart TD
    A[npm run db:setup] --> B[scripts/db-setup.sh]
    B --> C{Docker CLI available?}
    C -->|No| C1[Error: Install Docker]
    C -->|Yes| D{Docker daemon running?}
    D -->|No| D1[Error: Start Docker Desktop]
    D -->|Yes| E{.env exists?}
    E -->|No| E1[Copy .env.example → .env]
    E -->|Yes| F[Preserve existing .env]
    E1 --> G
    F --> G[docker compose up -d]
    G --> H{Health check loop}
    H -->|Healthy| I[Run init-schemas.sql]
    H -->|Timeout 60s| H1[Error: Container unhealthy]
    I --> J[prisma migrate dev]
    J -->|Success| K[npx tsx prisma/seed.ts]
    J -->|Fail| J1[Error: Migration failed]
    K -->|Success| L[Print summary]
    K -->|Fail| K1[Error: Seed failed]
    L --> M[Exit 0]
```

### Execution Flow

1. **Prerequisite Check** — Verify `docker` CLI on PATH, then verify daemon is responsive (`docker info`)
2. **Environment Bootstrap** — Ensure `.env` exists (copy from `.env.example` if missing)
3. **Container Lifecycle** — Start PostgreSQL via `docker compose up -d`, poll health check
4. **Schema Init** — Execute `scripts/init-schemas.sql` against the running container
5. **Migrations** — Run `prisma migrate dev` with 120s timeout
6. **Seed** — Run `npx tsx prisma/seed.ts`
7. **Summary** — Print connection info and next steps

### npm Script Integration

```json
{
  "db:setup": "sh scripts/db-setup.sh",
  "db:reset": "docker compose down -v && sh scripts/db-setup.sh"
}
```

The `db:reset` script destroys the `pgdata` volume (full data wipe) then re-runs the setup sequence.

## Components and Interfaces

### 1. Setup Script (`scripts/db-setup.sh`)

The main orchestrator. A POSIX shell script with the following internal functions:

| Function | Responsibility |
|----------|---------------|
| `check_docker()` | Verify Docker CLI exists and daemon is responsive |
| `check_compose()` | Detect `docker compose` (V2) or fall back to `docker-compose` (V1) |
| `ensure_env()` | Copy `.env.example` → `.env` if missing |
| `start_container()` | Run `$COMPOSE_CMD up -d` |
| `wait_for_healthy()` | Poll container health every 2s, timeout at 60s |
| `run_schemas()` | Execute `init-schemas.sql` via `docker exec` + `psql` |
| `run_migrations()` | Execute `npx prisma migrate dev` with 120s timeout |
| `run_seed()` | Execute `npx tsx prisma/seed.ts` |
| `print_summary()` | Display connection info and next-step commands |

### 2. Docker Compose Configuration (`docker-compose.yml`)

Updated configuration for the PostgreSQL service:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: autoflow-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-autoflow}
      POSTGRES_USER: ${POSTGRES_USER:-autoflow}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-autoflow_secret}
    ports:
      - '${POSTGRES_PORT:-6432}:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/init-schemas.sql:/docker-entrypoint-initdb.d/01-init-schemas.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-autoflow} -d ${POSTGRES_DB:-autoflow}']
      interval: 2s
      timeout: 5s
      retries: 30

volumes:
  pgdata:
    driver: local
```

Key changes from current state:
- Port mapping default changed from `5432:5432` to `6432:5432`
- Health check interval reduced from `10s` to `2s` for faster feedback
- Retries increased from `5` to `30` (2s × 30 = 60s timeout window)

### 3. Environment Template (`.env.example`)

Updated `DATABASE_URL` to use port 6432:

```
DATABASE_URL=postgresql://autoflow:autoflow_secret@localhost:6432/autoflow?schema=public
```

### 4. Schema Initializer (`scripts/init-schemas.sql`)

Existing file — no changes needed. Creates the four schemas idempotently via `CREATE SCHEMA IF NOT EXISTS`.

### 5. Package.json Scripts

Two new npm scripts added to the root `package.json`:

```json
{
  "db:setup": "sh scripts/db-setup.sh",
  "db:reset": "docker compose down -v && sh scripts/db-setup.sh"
}
```

### Interface Contracts

**Exit Codes:**
| Code | Meaning |
|------|---------|
| 0 | All steps completed successfully |
| 1 | Docker CLI not found |
| 1 | Docker daemon not responsive |
| 1 | `.env.example` missing when `.env` needs creation |
| 1 | Container health check timeout |
| 1 | Migration failure |
| 1 | Seed failure |

**stdout Messages:**
- Progress indicators with emoji prefixes (🔍, ✅, ⏳, 🌱, 📋)
- Final summary block with connection details

**stderr Messages:**
- Error messages with ❌ prefix
- Diagnostic commands for troubleshooting

## Data Models

This feature does not introduce new data models. It orchestrates existing infrastructure:

### Configuration Data Flow

```mermaid
flowchart LR
    A[.env.example] -->|copy if missing| B[.env]
    B -->|POSTGRES_* vars| C[docker-compose.yml]
    B -->|DATABASE_URL| D[Prisma CLI]
    C -->|container env| E[PostgreSQL Container]
    D -->|migrations| E
    D -->|seed| E
```

### Environment Variables

| Variable | Default | Used By |
|----------|---------|---------|
| `POSTGRES_DB` | `autoflow` | docker-compose → container |
| `POSTGRES_USER` | `autoflow` | docker-compose → container |
| `POSTGRES_PASSWORD` | `autoflow_secret` | docker-compose → container |
| `POSTGRES_PORT` | `6432` | docker-compose → port mapping |
| `DATABASE_URL` | `postgresql://autoflow:autoflow_secret@localhost:6432/autoflow?schema=public` | Prisma CLI |

### Container State Model

```mermaid
stateDiagram-v2
    [*] --> NotCreated
    NotCreated --> Starting: docker compose up -d
    Starting --> Healthy: pg_isready passes
    Starting --> Unhealthy: timeout (60s)
    Healthy --> Running: setup continues
    Unhealthy --> [*]: exit 1
    Running --> [*]: setup complete
```

## Error Handling

The script follows a **fail-fast** strategy: each step validates its preconditions and exits immediately on failure with a descriptive error message.

### Error Categories

| Category | Detection | User Action | Exit Code |
|----------|-----------|-------------|-----------|
| Missing Docker CLI | `command -v docker` fails | Install Docker Desktop | 1 |
| Docker daemon down | `docker info` non-zero or timeout | Start Docker Desktop | 1 |
| Missing `.env.example` | File not found when copy needed | Check git status / re-clone | 1 |
| Docker Compose unavailable | Both `docker compose` and `docker-compose` fail | Install Docker Desktop (includes Compose V2) | 1 |
| Container health timeout | 60s elapsed without healthy status | Check `docker logs autoflow-postgres` | 1 |
| Migration timeout | 120s elapsed | Check database connectivity, inspect migration files | 1 |
| Migration failure | `prisma migrate dev` non-zero exit | Read migration error output, fix schema issues | 1 |
| Seed failure | `npx tsx prisma/seed.ts` non-zero exit | Read seed error output, check database state | 1 |

### Error Message Format

All error messages follow a consistent pattern:

```
❌ [Step Name] failed: [Brief description]
   [Diagnostic hint or command]
```

Example:
```
❌ Health check failed: Container 'autoflow-postgres' did not become healthy within 60 seconds.
   Run: docker logs autoflow-postgres
   Run: docker inspect --format='{{.State.Health.Status}}' autoflow-postgres
```

### Timeout Implementation

```sh
# Health check polling with timeout
wait_for_healthy() {
  elapsed=0
  while [ "$elapsed" -lt 60 ]; do
    status=$(docker inspect --format='{{.State.Health.Status}}' autoflow-postgres 2>/dev/null)
    if [ "$status" = "healthy" ]; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}
```

For migration timeout, the script uses a background process with `kill` after 120s:

```sh
run_migrations() {
  npx prisma migrate dev --skip-generate &
  pid=$!
  elapsed=0
  while kill -0 "$pid" 2>/dev/null; do
    if [ "$elapsed" -ge 120 ]; then
      kill "$pid" 2>/dev/null
      echo "❌ Migration timed out after 120 seconds" >&2
      return 1
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  wait "$pid"
  return $?
}
```

### Idempotency Guards

Each step includes guards to skip already-completed work:

| Step | Guard Condition | Behavior When Satisfied |
|------|----------------|------------------------|
| `.env` copy | `.env` file exists | Skip copy, print info message |
| Container start | Container already running + healthy | Skip start, print info message |
| Schema init | Schemas already exist (CREATE IF NOT EXISTS) | SQL is no-op, no error |
| Migrations | No pending migrations | Prisma reports "already in sync" |
| Seed | Data already exists | Upsert updates existing records |

## Correctness Properties

This feature orchestrates external tools (Docker, Prisma CLI, PostgreSQL) via a shell script. Traditional property-based testing with randomized inputs does not apply because the script has no pure functions with meaningful input variation. Instead, the following invariants define correctness and are verified through integration and smoke tests:

### Property 1: Idempotency

**Validates: Requirements 9.1, 9.2, 9.3**

Running the script N times (N ≥ 1) on the same environment produces the same end state as running it once. No data is duplicated, no containers are recreated unnecessarily, and no errors are produced on subsequent runs.

**Verification**: Integration test — run 3× consecutively, assert identical DB state (row counts, schema versions, container status).

### Property 2: Fail-Fast Exit

**Validates: Requirements 1.2, 1.4, 2.3, 3.4, 4.3, 4.4, 5.2, 6.3**

Any step failure causes immediate exit with code 1 and no subsequent steps execute. The script never leaves the environment in a partially-modified state that could confuse the developer.

**Verification**: Unit test — mock each step to fail, assert no downstream side effects occur.

### Property 3: Port Isolation

**Validates: Requirements 2.4, 3.2, 6.1**

The API always connects to PostgreSQL via host port 6432, never 5432. This prevents conflicts with other local PostgreSQL instances.

**Verification**: Smoke test — grep `.env.example` and `docker-compose.yml` for port values; integration test — verify TCP connection on 6432 succeeds after setup.

### Property 4: Data Preservation

**Validates: Requirements 9.1, 9.4**

Re-runs never destroy existing developer data (database records, Docker volumes, `.env` file customizations).

**Verification**: Integration test — insert a custom row, re-run the script, assert the row persists unchanged.

### Property 5: Cross-Platform Shell Compliance

**Validates: Requirements 8.1, 8.6**

The script uses only POSIX `/bin/sh` constructs — no bash arrays, no `[[` brackets, no process substitution, no `local` keyword.

**Verification**: Static analysis — `shellcheck -s sh scripts/db-setup.sh` passes with zero errors or warnings.

### Property 6: Health Gate Ordering

**Validates: Requirements 3.3, 4.1**

Migrations never execute before the container health check reports healthy. This prevents connection timeouts and partial migration failures.

**Verification**: Integration test — introduce artificial health check delay, verify migration command is not invoked until healthy status is confirmed.

## Testing Strategy

### Why Property-Based Testing Does Not Apply

This feature is a **shell script orchestrating external tools** (Docker daemon, Prisma CLI, PostgreSQL). It does not contain pure functions with meaningful input variation. The acceptance criteria test:
- External service availability (Docker daemon status)
- File system operations (copy `.env.example`)
- Container lifecycle management (Docker Compose)
- CLI tool execution (Prisma migrate, seed)

None of these have a "for all inputs X, property P(X) holds" characteristic. Running 100+ iterations would mean 100+ Docker container operations — neither cost-effective nor revealing of additional bugs beyond 2-3 runs.

### Testing Approach

#### 1. Integration Tests (Primary)

Full end-to-end tests that exercise the actual script with Docker:

| Test | What It Verifies |
|------|-----------------|
| Fresh setup | Clean environment → all steps complete, exit 0 |
| Idempotent re-run | Run twice → second run succeeds, no data loss |
| Triple run | Run 3 times → identical state to single run |
| Partial recovery | Kill mid-migration → re-run completes successfully |
| New migrations | Add migration file → re-run applies only new migration |
| Port 6432 connectivity | Application can connect via localhost:6432 |

**Environment**: CI pipeline with Docker-in-Docker or Docker socket mount.

#### 2. Unit Tests (Shell Function Isolation)

Test individual shell functions with mocked commands:

| Test | Function | Mock |
|------|----------|------|
| Docker CLI missing | `check_docker()` | `command -v docker` returns 1 |
| Docker daemon down | `check_docker()` | `docker info` returns 1 |
| Compose V2 available | `check_compose()` | `docker compose version` returns 0 |
| Compose V1 fallback | `check_compose()` | V2 fails, `docker-compose --version` returns 0 |
| Neither compose available | `check_compose()` | Both fail |
| .env missing, example exists | `ensure_env()` | File system state |
| .env exists | `ensure_env()` | File system state |
| .env.example missing | `ensure_env()` | File system state |
| Health check success | `wait_for_healthy()` | Mock `docker inspect` returning "healthy" |
| Health check timeout | `wait_for_healthy()` | Mock always returning "starting" |

**Framework**: Shell unit testing with [bats-core](https://github.com/bats-core/bats-core) or inline test functions.

#### 3. Smoke Tests (Static Validation)

| Test | What It Checks |
|------|---------------|
| POSIX compliance | `shellcheck -s sh scripts/db-setup.sh` passes |
| docker-compose.yml valid | `docker compose config` parses without error |
| Port 6432 in .env.example | `DATABASE_URL` contains `:6432/` |
| Port 6432 in docker-compose | Port mapping is `6432:5432` |
| db:setup script in package.json | Script key exists and references `db-setup.sh` |
| db:reset script in package.json | Script key exists with `down -v` + setup |

#### 4. CI Integration

```yaml
# In .github/workflows/ci.yml
db-setup-test:
  runs-on: ubuntu-latest
  services:
    docker:
      image: docker:dind
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
    - run: npm ci
    - run: npm run db:setup
    - run: npm run db:setup  # idempotency check
    - run: npx prisma db pull --print  # verify schema
```

### Test File Locations

```
scripts/
├── db-setup.sh              # The setup script
├── db-setup.test.sh         # Bats unit tests (shell function tests)
└── init-schemas.sql         # Schema initializer

tests/
└── integration/
    └── db-setup.integration.test.ts  # Integration tests (Jest + Docker)
```

