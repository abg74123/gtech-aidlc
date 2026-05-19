# Requirements Document

## Introduction

This feature provides a one-command setup automation for the Docker-based PostgreSQL database environment. Team members on different machines (macOS, Linux, or Windows) should be able to bootstrap the entire database stack (Docker container, schema creation, Prisma migrations, and seed data) without manual steps or prior Docker knowledge. The Docker container exposes PostgreSQL on host port 6432 (mapped to container port 5432) to avoid conflicts with other local PostgreSQL instances that may already occupy port 5432. The goal is to eliminate the "cannot start the API server" problem caused by missing or misconfigured database environments.

## Glossary

- **Setup_Script**: A shell script that orchestrates the full database environment bootstrap process from Docker verification through seed data population
- **Docker_Engine**: The Docker runtime required to run containerized services on the developer's machine
- **Database_Container**: The PostgreSQL 16 Docker container defined in docker-compose.yml (named `autoflow-postgres`), exposing host port 6432 mapped to container port 5432
- **Schema_Initializer**: The SQL script (`scripts/init-schemas.sql`) that creates the four PostgreSQL schemas (master_data, transactions, warehouse, reports)
- **Migration_Runner**: The Prisma CLI command (`prisma migrate dev`) that applies database migrations to bring the schema up to date
- **Seed_Runner**: The Prisma seed command (`npx tsx prisma/seed.ts`) that populates initial reference data
- **Health_Check**: The `pg_isready` probe configured in docker-compose.yml that confirms PostgreSQL is accepting connections
- **Env_File**: The `.env` file containing database connection credentials and configuration (including DATABASE_URL with port 6432), derived from `.env.example`

## Requirements

### Requirement 1: Docker Prerequisite Verification

**User Story:** As a developer, I want the setup script to verify that Docker is installed and running, so that I get a clear error message instead of cryptic failures when Docker is missing.

#### Acceptance Criteria

1. WHEN the Setup_Script is executed, THE Setup_Script SHALL verify that the Docker CLI is available on the system PATH by checking that the `docker` command resolves to an executable
2. IF the Docker CLI is not found, THEN THE Setup_Script SHALL display an error message indicating that Docker is not installed, include a link to the official Docker installation page, and exit with status code 1
3. WHEN the Docker CLI is found, THE Setup_Script SHALL verify that the Docker Engine daemon is responsive by executing a Docker command (e.g., `docker info`) and confirming it returns a zero exit code within 5 seconds
4. IF the Docker Engine daemon is not responsive, THEN THE Setup_Script SHALL display an error message indicating that the Docker daemon is not running and instructing the developer to start Docker Desktop or the Docker service, and exit with status code 1
5. WHEN both the Docker CLI is found and the Docker Engine daemon is responsive, THE Setup_Script SHALL proceed to the next setup step without displaying an error message

### Requirement 2: Environment Configuration Bootstrap

**User Story:** As a developer, I want the setup script to ensure a valid `.env` file exists, so that the database container and Prisma can connect with correct credentials.

#### Acceptance Criteria

1. WHEN the Setup_Script is executed and the Env_File does not exist in the project root, THE Setup_Script SHALL copy `.env.example` to `.env` and print a message to stdout indicating that default values are being used
2. WHEN the Setup_Script is executed and the Env_File already exists in the project root, THE Setup_Script SHALL preserve the existing Env_File without modification and continue execution
3. IF the `.env.example` file does not exist in the project root when a copy is required, THEN THE Setup_Script SHALL print an error message to stderr indicating the missing template file and exit with a non-zero exit code
4. THE `.env.example` file SHALL define the DATABASE_URL using host port 6432 (e.g., `postgresql://postgres:postgres@localhost:6432/autoflow?schema=public`) so that the API connects to the Docker-exposed port and avoids conflicts with other local PostgreSQL instances on port 5432

### Requirement 3: Database Container Lifecycle Management

**User Story:** As a developer, I want the setup script to start the PostgreSQL container and wait until it is healthy, so that subsequent migration steps do not fail due to connection timeouts.

#### Acceptance Criteria

1. WHEN the Setup_Script has confirmed Docker is running, THE Setup_Script SHALL attempt to execute `docker compose up -d`; IF the `docker compose` command is not available, THEN THE Setup_Script SHALL fall back to `docker-compose up -d`
2. THE docker-compose.yml SHALL map host port 6432 to container port 5432 for the Database_Container so that the API and developer tools connect via port 6432 without conflicting with other local PostgreSQL instances
3. WHEN the Database_Container is starting, THE Setup_Script SHALL poll the container health status every 2 seconds until the Health_Check reports a healthy status or the timeout is reached
4. IF the Health_Check does not report healthy within 60 seconds, THEN THE Setup_Script SHALL display a timeout error message indicating the container name, the command to retrieve container logs, and the command to check health status, and exit with a non-zero status code
5. WHEN the Database_Container is already running and healthy, THE Setup_Script SHALL display an informational message indicating the container is already running and proceed to the next step without restarting the container
6. WHEN the Database_Container reaches healthy status, THE Setup_Script SHALL display a success message indicating the container is ready and proceed to the next step

### Requirement 4: Database Schema and Migration Execution

**User Story:** As a developer, I want the setup script to run Prisma migrations automatically after the database is ready, so that the database schema is always up to date without manual intervention.

#### Acceptance Criteria

1. WHEN the Database_Container Health_Check reports healthy, THE Setup_Script SHALL execute the Schema_Initializer to ensure the four PostgreSQL schemas (master_data, transactions, warehouse, reports) exist before running migrations
2. WHEN the Schema_Initializer has completed successfully, THE Setup_Script SHALL execute the Migration_Runner to apply all pending Prisma migrations across all configured schemas
3. IF the Migration_Runner does not complete within 120 seconds, THEN THE Setup_Script SHALL terminate the migration process, display a timeout error message, and exit with a non-zero status code
4. IF the Migration_Runner fails, THEN THE Setup_Script SHALL display the migration error output (stdout and stderr) and exit with a non-zero status code
5. WHEN all migrations are already applied, THE Setup_Script SHALL display a message indicating no pending migrations and proceed to the next step

### Requirement 5: Seed Data Population

**User Story:** As a developer, I want the setup script to seed initial data after migrations complete, so that I can immediately test the API with pre-configured users and roles.

#### Acceptance Criteria

1. WHEN migrations have completed successfully, THE Setup_Script SHALL execute the Seed_Runner to populate initial users (one per role: Cashier, Store, Supervisor, Manager, CFO, Admin) and reference data
2. IF the Seed_Runner fails, THEN THE Setup_Script SHALL display the seed error output (stdout and stderr from the Seed_Runner process) and exit with a non-zero status code
3. WHEN the Setup_Script is executed and seed data already exists in the database, THE Setup_Script SHALL complete seeding without duplicate data errors by relying on the Seed_Runner's upsert behavior
4. WHEN the Seed_Runner completes without error, THE Setup_Script SHALL display a confirmation message indicating the number of seeded entities

### Requirement 6: Setup Completion Summary

**User Story:** As a developer, I want a clear summary at the end of the setup process, so that I know the environment is ready and how to start the API server.

#### Acceptance Criteria

1. WHEN all setup steps complete successfully, THE Setup_Script SHALL display a summary showing the actual configured database host, port 6432, database name, and the command to start the API server (e.g., `npx nx serve api`)
2. WHEN all setup steps complete successfully, THE Setup_Script SHALL exit with status code 0
3. IF any setup step fails, THEN THE Setup_Script SHALL exit with a non-zero status code without displaying the completion summary

### Requirement 7: npm Script Integration

**User Story:** As a developer, I want to run the setup via an npm script, so that the workflow is consistent with other project commands and discoverable in package.json.

#### Acceptance Criteria

1. THE package.json SHALL include a `db:setup` script that executes `scripts/db-setup.sh`
2. WHEN a developer runs `npm run db:setup`, THE Setup_Script SHALL execute the bootstrap sequence in order: start the Docker Compose services, wait for the PostgreSQL health check to pass, run Prisma migrations, and run the database seed
3. WHEN the Setup_Script completes all bootstrap steps successfully, THE Setup_Script SHALL exit with code 0
4. IF any step in the bootstrap sequence fails, THEN THE Setup_Script SHALL exit with a non-zero exit code and print an error message indicating which step failed
5. THE package.json SHALL include a `db:reset` script that stops running Docker Compose services, destroys the `pgdata` Docker volume, and then executes the `db:setup` sequence
6. WHEN a developer runs `npm run db:setup` and the Docker Compose services are already running, THE Setup_Script SHALL proceed without error by reusing the existing running containers

### Requirement 8: Cross-Platform Compatibility

**User Story:** As a developer on macOS or Windows, I want the setup script to work on my operating system, so that all team members can onboard regardless of their machine.

#### Acceptance Criteria

1. THE Setup_Script SHALL use a `#!/bin/sh` shebang and POSIX-compatible shell syntax (no bash arrays, no `[[` test brackets, no process substitution, no `local` keyword) that runs on macOS, Linux, and Windows Subsystem for Linux (WSL)
2. THE package.json `db:setup` script SHALL invoke the Setup_Script in a manner compatible with both macOS/Linux shells and Windows (via npm's built-in shell execution or a cross-platform runner) so that native Windows users without WSL can execute the setup
3. THE Setup_Script SHALL use `docker compose` (V2 syntax) as the container orchestration command
4. IF `docker compose` is not available, THEN THE Setup_Script SHALL check for `docker-compose` (V1 syntax) and use it as a fallback
5. IF neither `docker compose` nor `docker-compose` is available, THEN THE Setup_Script SHALL exit with a non-zero exit code and print an error message indicating that Docker Compose is required and how to install it
6. THE docker-compose.yml SHALL use only features supported by Docker Desktop on both macOS and Windows (including volume mounts and port mappings) to ensure consistent behavior across platforms

### Requirement 9: Idempotent Execution

**User Story:** As a developer, I want to run the setup script multiple times safely, so that I can re-run it after pulling new changes without breaking my existing environment.

#### Acceptance Criteria

1. WHEN the Setup_Script is executed on an already-configured environment, THE Setup_Script SHALL preserve all existing database records, container volumes, and local configuration files created by the developer
2. WHEN the Setup_Script is executed 3 or more consecutive times on the same environment, THE Setup_Script SHALL result in all containers running, all migrations applied, and seed data present with no duplicate entries — identical to the state after a single execution
3. IF a setup step is already satisfied (container running, migrations applied, seed data present), THEN THE Setup_Script SHALL proceed without re-executing that step and without producing an error
4. WHEN the Setup_Script detects new migration files not yet applied to the database, THE Setup_Script SHALL apply only the pending migrations without re-running previously applied migrations and without modifying existing table data
5. IF a previous execution of the Setup_Script terminated before completion, THEN THE Setup_Script SHALL recover by completing the remaining steps without duplicating already-completed steps
