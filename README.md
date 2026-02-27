## Aidoris

### Content Table

1. [Workspace layout](#workspace-layout)
2. [Tooling & package manager](#tooling--package-manager)
3. [Dependency catalog](#dependency-catalog)
4. [Git hooks & validation](#git-hooks--validation)
5. [Documentation](#documentation)

### Workspace layout

The following folders are managed as Bun workspaces in this monorepo (see `package.json`):

- `cli/**` — command-line tools and entrypoints.
- `config/**` — shared configuration and workspace-level tooling.
- `daemon/**` — long-running background daemons and services.
- `lib/db` — database access helpers and utilities.
- `lib/repo/**` — repository layer and data access abstractions.
- `lib/svc/**` — service layer and business logic.
- `schema/**` — shared schemas and types used across services.
- `.config/` — VS Code / VS Code–based workspace files.

### Tooling & package manager

This workspace uses **Bun** as both the package manager and runtime, configured via the `packageManager` field in `package.json`.  
The root workspace package is `@aidoris/base`, which currently defines a `prepare` script that wires up Git hooks via **Husky**.

- Install dependencies from this workspace:

```bash
bun install
```

- Run the root `prepare` script (sets up Husky Git hooks):

```bash
bun run prepare
```

- For OS-specific Bun installation instructions and general Bun usage (including details on the `migrate:catalog` script described below), see [Project usage with Bun](docs/project-usage-bun.md).

### Dependency catalog

This workspace centralizes dependency versions using **Bun catalogs**, configured in the root `package.json`:

- The `catalog` field holds the **default catalog**, a map of package names to concrete versions.
- The `catalogs` field (if present) holds **named catalogs**, such as `"test"` or `"lint"`, each with its own map of package versions.

Workspace `package.json` files are expected to reference dependencies using:

- `catalog:` — use the default catalog version from the root `catalog` object.
- `catalog:<name>` — use a named catalog from the root `catalogs.<name>` object.
- `workspace:*` — depend on another workspace package whose `name` matches the dependency name.

You can normalize existing dependency versions and populate the root catalogs using the migration script:

```bash
bun run migrate:catalog
```

This script:

- Scans all workspace `package.json` files (excluding `node_modules` and `.git`).
- Moves concrete versions into the root `catalog`/`catalogs` fields where needed.
- Rewrites non-config workspace dependency versions to use `catalog:` / `catalog:<name>` while keeping their effective versions centralized.

For more details on how catalogs work and how to fix catalog-related issues, see [Dependency catalog](docs/dependency-catalog.md).

### Git hooks & validation

After running `bun run prepare`, Husky installs Git hooks that run **Bun-based validation scripts** in the `.husky/` directory before commits are created.

Key validations include:

- **Dependency catalog validation** (`.husky/validate-catalog-dependencies.ts`)
  - Ensures all workspace dependency sections (`dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`) use one of:
    - `catalog:` (default catalog)
    - `catalog:<name>` (named catalog)
    - `workspace:*` (workspace-local dependency)
  - Verifies that every `catalog:` / `catalog:<name>` reference actually exists in the root `package.json` `catalog`/`catalogs` fields.
  - Fails the commit with a detailed list of violations if anything is misconfigured.

- **Workspace folder validation** (`.husky/validate-workspace-folders.ts`)
  - Validates that the checked-in workspace files:
    - `.config/aidoris.worktree.code-workspace`
    - `.config/aidoris.code-workspace`
  - Contain exactly the expected `folders` entries for the `main` and `develop` trees.
  - Prevents committing changes that add/remove/modify these `folders` entries.

If a commit fails due to one of these hooks, read the error output, fix the reported issues (for example, by updating the root catalogs or reverting changes to the workspace files), and then re-run your commit.  
For more details and troubleshooting tips, see [Git hooks & workspace validation](docs/git-hooks-and-workspace-validation.md).

### Documentation

The `docs/` directory contains additional, focused documentation for working with this workspace:

- **Workspace usage** — see [Open Workspace](docs/open-workspace.md) for instructions on opening the `.config/aidoris.code-workspace` and `.config/aidoris.worktree.code-workspace` files in VS Code or compatible IDEs, and notes about how these files are validated.
- **Project usage with Bun** — see [Project usage with Bun](docs/project-usage-bun.md) for OS-specific Bun installation steps, how to run scripts with Bun, and when to use `migrate:catalog`.
- **Dependency catalog** — see [Dependency catalog](docs/dependency-catalog.md) for details on how dependency versions are centralized using Bun catalogs, how the migration script works, and how to resolve catalog issues.
- **Git hooks & workspace validation** — see [Git hooks & workspace validation](docs/git-hooks-and-workspace-validation.md) for an overview of the Husky hooks configured in this workspace and guidance for resolving hook failures.
