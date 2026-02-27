## Husky Git hooks in this workspace

This workspace uses **Husky** to install Git hooks that run before commits are created.  
The hooks are implemented as Bun-based TypeScript scripts in the `.husky/` directory and are wired up by the root `prepare` script.

From the workspace root:

```bash
bun run prepare
```

This command configures Husky so that the hooks run automatically during `git commit`.

```mermaid
flowchart LR
  dev[Developer] --> commit[git commit]
  commit --> husky[Husky pre-commit]
  husky --> validateDeps[validate-catalog-dependencies.ts]
  husky --> validateWs[validate-workspace-folders.ts]
  validateDeps --> depsOk{Catalogs valid?}
  validateWs --> wsOk{Workspace files valid?}
  depsOk -- yes --> done[Commit succeeds]
  wsOk -- yes --> done
  depsOk -- no --> failDeps[Commit blocked\n(fix catalog issues)]
  wsOk -- no --> failWs[Commit blocked\n(fix workspace files)]
```

---

### Dependency catalog validation (pre-commit)

The script `.husky/validate-catalog-dependencies.ts` ensures that all workspace dependencies correctly reference the root **dependency catalogs**.

At a high level, it:

1. Reads the root `package.json` and loads:
   - The `catalog` object (default catalog).
   - The `catalogs` object (named catalogs).
2. Scans all workspace `package.json` files (excluding the root and any under `node_modules` or `.git`).
3. Validates each dependency section (`dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`) to ensure:
   - Every dependency uses **one of the allowed specifiers**:
     - `catalog:` — default catalog entry.
     - `catalog:<name>` — named catalog entry.
     - `workspace:*` — workspace-local dependency.
   - For `catalog:`:
     - The dependency’s name exists as a key in the root `catalog` object.
   - For `catalog:<name>`:
     - The named catalog exists in `catalogs`.
     - The dependency’s name exists as a key in `catalogs[<name>]`.
4. Records any violations and, if any are found, prints a detailed error report and exits with a non-zero status, causing the commit to fail.

Typical failure messages include:

- A dependency using `catalog:` that is missing from the root `catalog`.
- A dependency using `catalog:<name>` that is missing from `catalogs.<name>`.
- A dependency using a plain semver string (for example, `"^1.2.3"`) instead of a catalog reference or `workspace:*`.

#### Fixing catalog validation failures

When this hook fails:

1. Read the error output; it tells you:
   - Which `package.json` file is affected.
   - Which dependency and which section (`dependencies`, `devDependencies`, etc.) is incorrect.
   - What is wrong with the current specifier.
2. Fix the issue by:
   - Adding or updating entries in the root `catalog` or `catalogs` objects in `package.json`, or
   - Converting plain versions to `catalog:` / `catalog:<name>` or `workspace:*` as appropriate.
3. Optionally run:

   ```bash
   bun run migrate:catalog
   ```

   to normalize dependency declarations across the workspace.
4. Re-attempt the commit once the violations have been resolved.

For more information about the catalog layout and the migration script, see [Dependency catalog](dependency-catalog.md).

---

### Workspace folder validation (pre-commit)

The script `.husky/validate-workspace-folders.ts` protects the structure of the checked-in VS Code workspace files:

- `.config/aidoris.worktree.code-workspace`
- `.config/aidoris.code-workspace`

It validates that:

- `.config/aidoris.worktree.code-workspace` has a `folders` array that contains **exactly**:

  ```json
  {
    "folders": [
      { "path": "../../main" },
      { "path": "../../develop" }
    ]
  }
  ```

- `.config/aidoris.code-workspace` has a `folders` array that contains **exactly**:

  ```json
  {
    "folders": [
      { "path": "." }
    ]
  }
  ```

If either workspace file is missing, cannot be parsed, or has a `folders` array that differs from these expected values (including additional, removed, or reordered entries), the hook:

- Prints an error that shows the expected JSON shape.
- Exits with a non-zero status, causing the commit to fail.

#### Fixing workspace validation failures

If this hook prevents a commit:

1. Open the workspace file reported in the error message.
2. Revert changes to the `folders` array so it matches the expected configuration shown above.
3. Avoid adding additional roots to the checked-in workspace files. If you need a custom workspace:
   - Create your own `.code-workspace` file (for example, in your home directory).
   - Add whatever folders you need there, including additional Git worktrees.
4. Re-attempt the commit after restoring the expected `folders` configuration.

For guidance on how to open the existing workspace files and how to work with additional Git worktrees without modifying `.config/*.code-workspace`, see [Open Workspace](open-workspace.md).

---

### Troubleshooting failed commits

When a commit fails because of one of these hooks:

- **Read the output carefully** — it includes the specific file paths and dependencies or settings that need adjustment.
- **Do not bypass the hooks** (for example, with `--no-verify`) unless you fully understand the implications and have a strong reason.
- **Use the migration and catalog tools**:
  - Run `bun run migrate:catalog` to normalize dependency declarations when appropriate.
- **Restore validated workspace files**:
  - Revert unintended changes to `.config/aidoris.code-workspace` and `.config/aidoris.worktree.code-workspace`.

Once the underlying issue is fixed, re-run your commit and the hooks should pass.

