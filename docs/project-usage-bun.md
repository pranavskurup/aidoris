## Project usage with Bun (per OS)

This project uses **Bun** as its package manager and runtime (see `packageManager` in `package.json`).  
The sections below describe how to install Bun and run the project on different operating systems.

> All commands assume you are running them from the `develop` workspace directory for this project.

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

### 2. Install project dependencies

Once Bun is installed and available on your `PATH`:

1. Open a terminal (or PowerShell on Windows).
2. Navigate to the `develop` workspace directory for this project.
3. Install dependencies with Bun:

   ```bash
   bun install
   ```

This reads `package.json` and `bun.lockb` (if present) and installs all required dependencies using Bun’s package manager.

---

### 3. Running project scripts with Bun

This project declares its Bun configuration in `package.json`. Any scripts defined there can be run via `bun run`.

From the `develop` directory:

```bash
bun run <script-name>
```

Examples (depending on which scripts are defined in `package.json`):

- Start a development server:

  ```bash
  bun run dev
  ```

- Run tests:

  ```bash
  bun test
  ```

- Run linting:

  ```bash
  bun run lint
  ```

> Adjust `<script-name>` to match the actual scripts defined in this project’s `package.json`.

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

Once Bun is installed and dependencies are set up, you can use the workspace files (`aidoris.code-workspace` and `aidoris.worktree.code-workspace`) described in [Open Workspace](../docs/open-workspace.md) to open the project in VS Code or a compatible IDE and run these Bun commands from the integrated terminal.

