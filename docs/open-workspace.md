## Opening this workspace in VS Code or VS Code–based IDEs

This is the **develop** workspace, a Bun-based monorepo whose root package is `@aidoris/base`.  
When you open the workspace files described below, VS Code and compatible editors (such as Cursor or VSCodium) load the main folders and packages defined in `package.json` (for example `cli`, `config`, `daemon`, `lib`, and `schema`) into a single window so you can work across the whole monorepo at once.

### Workspace folders included

When you open the workspace files, the explorer typically includes folders such as:

- `cli/**` — CLI tools and entrypoints.
- `config/**` — shared configuration and workspace-level tooling.
- `daemon/**` — daemon processes and background services.
- `lib/**` — shared libraries, repositories, services, and database utilities.
- `schema/**` — shared schemas and types.
- `.config/` — the workspace configuration files themselves.

The workspace files are:

- `aidoris.code-workspace` — single-root workspace for this develop tree
- `aidoris.worktree.code-workspace` — multi-root workspace for Git worktree setups (`main` + `develop`)

Use the steps below to open them.

### Open via VS Code menu

1. Start **VS Code**.
2. In the top menu, choose **File → Open Workspace from File…** (or **Open Workspace** in some VS Code–based IDEs).
3. In the file chooser:
   - Navigate to the develop workspace.
   - Open the `.config` directory.
   - Select `aidoris.code-workspace`.
4. Click **Open**.

VS Code will load the workspace with all folders and settings defined in the workspace file.

### Open via command line

If the `code` CLI is installed and available in your shell:

```bash
code .config/aidoris.code-workspace
```

This opens the develop workspace directly in a new VS Code window.

### Using the worktree workspace (main + develop)

The `aidoris.worktree.code-workspace` file is useful when you are working with Git worktrees or want to open both the `main` and `develop` trees in a single VS Code window.

#### Open the worktree workspace via VS Code menu

1. Start **VS Code**.
2. In the top menu, choose **File → Open Workspace from File…**.
3. In the file chooser:
   - Navigate to the develop workspace.
   - Open the `.config` directory.
   - Select `aidoris.worktree.code-workspace`.
4. Click **Open**.

VS Code will open a multi-root workspace with both the `main` and `develop` folders.

#### Open the worktree workspace via command line

If the `code` CLI is installed:

```bash
code .config/aidoris.worktree.code-workspace
```

This opens the multi-root worktree workspace in a new VS Code window.

### Working with additional Git worktrees

You can still create additional Git worktrees for new branches (for example, feature branches). However, the checked-in workspace files in `.config/` are **validated by a pre-commit hook** and their `folders` entries must remain unchanged.

#### 1. Create a new worktree from `develop`

From the `develop` worktree directory:

If you are already working in another worktree, first move into the `develop` directory for this repository. If you do not yet have a local `develop` worktree, clone the repository and checkout the `develop` branch into a `develop` directory, then run the commands below from there.

```bash
# From the develop worktree directory

# Option A: create a new branch and worktree in one go
git worktree add ../feature-my-branch -b feature/my-branch

# Option B: create the branch first, then the worktree
git switch -c feature/my-branch
git worktree add ../feature-my-branch feature/my-branch
```

This creates a new sibling directory (for example, `feature-my-branch`) next to `main` and `develop`, checked out at `feature/my-branch`.

#### 2. Open the new worktree in your editor

To work on the new worktree in VS Code or a compatible IDE, you have a few options:

- **Open the worktree directly**
  - From the parent directory that contains `main`, `develop`, and your new worktree:
  - Run:

    ```bash
    code ../feature-my-branch
    ```

  - Or use **File → Open Folder…** in the UI and select the new worktree directory.

- **Create your own multi-root workspace (optional)**
  - If you want a multi-root view that includes the new worktree alongside `main` and/or `develop`, you can create a separate `.code-workspace` file (for example, in your home directory or another location outside `.config/`) and add the desired folders there.
  - This custom workspace will not be validated by the repository’s pre-commit hooks.

> Do **not** modify `.config/aidoris.code-workspace` or `.config/aidoris.worktree.code-workspace` to add or remove folders.  
> A Husky pre-commit hook enforces their `folders` arrays and will fail commits if they are changed. For more details, see [Git hooks & workspace validation](git-hooks-and-workspace-validation.md).

### Open in other VS Code–based IDEs

For other editors built on VS Code (for example, Cursor or VSCodium):

1. Launch the editor.
2. Use the **File** menu option that mentions **Workspace** (for example, **Open Workspace**, **Open Workspace from File…**, or similar).
3. Browse to the develop workspace, go into the `.config` folder, and choose `aidoris.code-workspace`.

Once opened, you can pin this workspace in your editor’s recent workspaces list for quicker access in the future.

