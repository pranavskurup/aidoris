## Aidoris

### Content Table

1. [Workspace layout](#workspace-layout)
2. [Tooling & package manager](#tooling--package-manager)
3. [Documentation](#documentation)

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

- For OS-specific Bun installation instructions and general Bun usage, see [Project usage with Bun](docs/project-usage-bun.md).

### Documentation

The `docs/` directory contains additional, focused documentation for working with this workspace:

- **Workspace usage** — see [Open Workspace](docs/open-workspace.md) for instructions on opening the `.config/aidoris.code-workspace` and `.config/aidoris.worktree.code-workspace` files in VS Code or compatible IDEs.
- **Project usage with Bun** — see [Project usage with Bun](docs/project-usage-bun.md) for OS-specific Bun installation steps and how to run scripts with Bun.
