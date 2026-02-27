## Project usage with Bun (per OS)

This is the **develop** workspace, a Bun-based monorepo that uses **Bun** as its package manager and runtime (see `packageManager` in `package.json`).  
The sections below describe how to install Bun, set up dependencies for all workspaces, and run scripts on different operating systems.

> All commands assume you are running them from the develop workspace.

### Monorepo workspaces

This workspace is configured as a Bun-powered monorepo via the `workspaces` field in `package.json`. Running Bun commands from this workspace lets you manage dependencies and scripts for multiple packages at once.

The main workspace patterns include:

- `cli/**` — command-line tools and entrypoints.
- `config/**` — shared configuration and workspace-level tooling.
- `daemon/**` — daemon processes and background services.
- `lib/db` — database access helpers and utilities.
- `lib/repo/**` — repository layer and data access abstractions.
- `lib/svc/**` — service layer and business logic.
- `schema/**` — shared schemas and types used across services.

Common usage patterns:

- Install all dependencies for every workspace from this workspace:

  ```bash
  bun install
  ```

- Run a script defined in this workspace's `package.json` (if present):

  ```bash
  bun run <script-name>
  ```

- Run scripts defined in a specific workspace package:

  ```bash
  cd path/to/workspace
  bun run <script-name>
  ```

> Adjust `<script-name>` and `path/to/workspace` to match the actual scripts and folders in this workspace.

---

### 1. Install Bun

#### Linux and macOS

1. Open a terminal.
2. Install Bun using the official install script:

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. Restart your terminal session so that `bun` is available on your `PATH`.
4. Verify the installation:

   ```bash
   bun --version
   ```

#### Windows (PowerShell)

You can install Bun natively on recent versions of Windows using PowerShell.

1. Open **PowerShell** as your user.
2. Run the official install script:

   ```powershell
   powershell -c "irm bun.sh/install.ps1|iex"
   ```

3. Close and reopen PowerShell (or your terminal) so `bun` is on your `PATH`.
4. Verify the installation:

   ```powershell
   bun --version
   ```

If you prefer WSL, you can follow the **Linux** instructions from within an Ubuntu (or other) WSL distribution instead.

---

### 2. Install dependencies

Once Bun is installed and available on your `PATH`:

1. Open a terminal (or PowerShell on Windows).
2. Navigate to the develop workspace.
3. Install dependencies with Bun:

   ```bash
   bun install
   ```

This reads `package.json` and `bun.lockb` (if present) and installs all required dependencies using Bun’s package manager.

---

### 3. Running scripts with Bun

This workspace declares its Bun configuration in `package.json`. Any scripts defined there can be run via `bun run`.

From this workspace:

```bash
bun run <script-name>
```

Examples (as currently defined in the root `package.json`):

- Root `prepare` script (sets up Husky Git hooks defined by `@aidoris/base`):

  ```bash
  bun run prepare
  ```

- Dependency catalog migration (normalizes workspace dependencies to use Bun catalogs and syncs the root `catalog`/`catalogs` fields):

  ```bash
  bun run migrate:catalog
  ```

> The exact set of available scripts depends on the current contents of this monorepo and may grow over time.  
> Check the `scripts` section of the root `package.json` (and any workspace package’s `package.json`) to see which commands are available, and run them with `bun run <script-name>`.

> For details on how the dependency catalog works and what `migrate:catalog` does, see [Dependency catalog](dependency-catalog.md).

---

### 4. OS-specific notes

- **Linux**
  - Use your preferred terminal emulator (e.g., GNOME Terminal, Konsole, Alacritty).
  - Ensure your shell startup files (such as `~/.bashrc` or `~/.zshrc`) export Bun’s `bin` directory on `PATH` if the installer did not do it automatically.

- **macOS**
  - If using Homebrew and non-default shells, make sure the Bun installer’s `PATH` configuration is sourced (usually via `~/.zshrc` or `~/.bash_profile`).
  - You can run the same `bun` commands from the integrated terminal inside VS Code or any VS Code–based IDE.

- **Windows**
  - Prefer running commands from **PowerShell** or **Windows Terminal**.
  - After installing Bun, confirm that `~/.bun/bin` (or the installer’s chosen location) is included in your `PATH`.
  - If using WSL, follow the Linux instructions from inside your WSL distro instead of native PowerShell.

Once Bun is installed and dependencies are set up, you can use the workspace files (`aidoris.code-workspace` and `aidoris.worktree.code-workspace`) described in [Open Workspace](open-workspace.md) to open the develop workspace in VS Code or a compatible IDE and run these Bun commands from the integrated terminal.

