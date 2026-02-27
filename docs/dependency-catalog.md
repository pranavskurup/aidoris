## Dependency catalog overview

This workspace uses **Bun catalogs** to centralize dependency versions across all workspaces.  
Instead of repeating concrete versions (for example, `"^1.2.3"`) in every `package.json`, most dependencies reference a catalog entry, and the actual version lives in the root `package.json`.

The goals are:

- Keep dependency versions in sync across all packages.
- Make it easy to upgrade a dependency in one place.
- Ensure commits only contain references to vetted versions.

---

### Where versions live

The root `package.json` defines catalog data:

- `catalog`
  - The **default catalog**, a map of package name → version.
  - Example:

    ```json
    "catalog": {
      "husky": "^9.1.7",
      "@types/bun": "^1.3.9"
    }
    ```

- `catalogs`
  - Optional **named catalogs**, each with its own map of versions.
  - Example:

    ```json
    "catalogs": {
      "test": {
        "vitest": "^2.0.0"
      }
    }
    ```

When you add new dependencies to the workspace, their concrete versions should be represented in these catalog objects rather than duplicated across multiple `package.json` files.

> The `config/ts/package.json` file may also be used by tooling (such as the migration script) as a source of canonical versions for shared tooling dependencies.

---

### Allowed dependency specifiers in workspaces

Workspace `package.json` files are expected to use one of the following dependency specifiers:

- **Default catalog**:

  ```json
  "some-dependency": "catalog:"
  ```

  - The actual version is read from the root `package.json` `catalog` object under `"some-dependency"`.

- **Named catalog**:

  ```json
  "some-dependency": "catalog:test"
  ```

  - The actual version is read from the root `package.json` `catalogs.test` object under `"some-dependency"`.

- **Workspace dependency**:

  ```json
  "some-workspace-package": "workspace:*"
  ```

  - The dependency refers to another workspace package whose `name` field in its `package.json` matches `"some-workspace-package"`.

> Plain semver strings such as `"^1.2.3"` should generally **not** be committed in non-config workspace `package.json` files.  
> Instead, version changes should happen by updating the root `catalog`/`catalogs` objects (or by running the migration script described below).

---

### Migrating existing dependencies

The script `scripts/migrate-dependencies-to-catalog.ts` can normalize existing dependencies to use catalogs and ensure the root catalog definitions are populated.

From the workspace root:

```bash
bun run migrate:catalog
```

This script:

- Scans all `package.json` files in the workspace (excluding `node_modules` and `.git`).
- Reads the root `catalog` and `catalogs` objects from the root `package.json`.
- Uses dependencies from `config/ts/package.json` (if present) as a seed for common tool-related versions.
- For non-config workspace `package.json` files:
  - Adds any missing catalog entries to the root `catalog`/`catalogs`.
  - Rewrites concrete dependency versions to use `"catalog:"` (or keep `"workspace:*"` where appropriate).
- Writes the updated `package.json` files back to disk.

#### Error conditions

If the migration script encounters inconsistent or incomplete catalog information, it will fail with a descriptive error message, for example:

- **Missing default catalog entries**
  - A dependency uses `"catalog:"` but there is no version for that dependency in the root `catalog` or `config/ts/package.json`.
- **Missing named catalog entries**
  - A dependency uses `"catalog:<name>"` but there is no corresponding entry for that dependency under `catalogs.<name>` or in `config/ts/package.json`.
- **Missing workspace dependencies**
  - A dependency uses `"workspace:*"` but there is no workspace `package.json` whose `name` matches the dependency name.

When this happens:

- Read the error output carefully (it lists the exact file, section, and dependency).
- Add or correct entries in the root `catalog`/`catalogs` objects (or fix the workspace package names for `workspace:*`).
- Re-run:

  ```bash
  bun run migrate:catalog
  ```

until the script completes successfully.

---

### Pre-commit validation of catalogs

To keep catalog usage consistent, a Husky pre-commit hook (`.husky/validate-catalog-dependencies.ts`) validates dependency records in each workspace `package.json`:

- Ensures that each dependency specifier is one of:
  - `catalog:`
  - `catalog:<name>`
  - `workspace:*`
- Verifies that for every `catalog:` and `catalog:<name>` specifier:
  - The dependency exists in the root `package.json` `catalog` or `catalogs.<name>` object.
- Fails the commit if any violations are found and prints a detailed list of issues.

If you see a pre-commit failure from this hook:

1. Read the messages to identify which `package.json` and which dependency is problematic.
2. Either:
   - Add or fix the entry in the root `catalog`/`catalogs`, or
   - Adjust the dependency specifier to use the correct catalog reference or `workspace:*`.
3. Re-run your commit once all issues are fixed.

For a broader overview of all Git hooks used in this workspace and additional troubleshooting steps, see [Git hooks & workspace validation](git-hooks-and-workspace-validation.md).

