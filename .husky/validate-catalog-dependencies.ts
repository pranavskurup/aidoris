type DependencySectionName =
  | "dependencies"
  | "devDependencies"
  | "peerDependencies"
  | "optionalDependencies";

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  catalog?: Record<string, string>;
  catalogs?: Record<string, Record<string, string>>;
};

const ROOT_PACKAGE_JSON_PATH = "package.json";
const CATALOG_PREFIX = "catalog:";
const WORKSPACE_VALUE = "workspace:*";

const readJsonFile = async <T>(path: string): Promise<T> => {
  const file = Bun.file(path);

  if (!(await file.exists())) {
    console.error(
      `[pre-commit] Missing JSON file at "${path}". Please restore it before committing.`
    );
    process.exit(1);
  }

  try {
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch {
    console.error(
      `[pre-commit] Failed to read or parse "${path}" as JSON.`
    );
    process.exit(1);
  }
};

const loadRootCatalogInfo = async (): Promise<{
  catalog: Record<string, string>;
  catalogs: Record<string, Record<string, string>>;
}> => {
  const rootPackageJson = await readJsonFile<PackageJson>(
    ROOT_PACKAGE_JSON_PATH
  );

  return {
    catalog: rootPackageJson.catalog ?? {},
    catalogs: rootPackageJson.catalogs ?? {},
  };
};

const collectWorkspacePackageJsonPaths = async (): Promise<string[]> => {
  const glob = new Bun.Glob("**/package.json");
  const packageJsonPaths: string[] = [];

  for await (const path of glob.scan(".")) {
    if (path === "package.json" || path === "./package.json") {
      continue;
    }

    if (path.includes("node_modules/") || path.includes("/.git/")) {
      continue;
    }

    const normalizedPath = path.startsWith("./") ? path.slice(2) : path;
    packageJsonPaths.push(normalizedPath);
  }

  return packageJsonPaths;
};

const validateDependencyRecord = (
  sectionName: DependencySectionName,
  record: Record<string, string> | undefined,
  filePath: string,
  rootCatalog: Record<string, string>,
  rootCatalogs: Record<string, Record<string, string>>,
  violations: string[]
) => {
  if (!record) {
    return;
  }

  for (const [dependencyName, rawSpecifier] of Object.entries(record)) {
    const specifier = rawSpecifier.trim();

    if (specifier === WORKSPACE_VALUE) {
      continue;
    }

    if (specifier === CATALOG_PREFIX) {
      if (!Object.prototype.hasOwnProperty.call(rootCatalog, dependencyName)) {
        violations.push(
          `[${filePath}] ${sectionName} dependency "${dependencyName}" is using "${CATALOG_PREFIX}" but "${dependencyName}" is not defined in the root package.json "catalog" object.`
        );
      }

      continue;
    }

    if (specifier.startsWith(CATALOG_PREFIX)) {
      const catalogName = specifier.slice(CATALOG_PREFIX.length);

      if (!catalogName) {
        continue;
      }

      const group = rootCatalogs[catalogName];

      if (
        !group ||
        !Object.prototype.hasOwnProperty.call(group, dependencyName)
      ) {
        violations.push(
          `[${filePath}] ${sectionName} dependency "${dependencyName}" is using "${specifier}" but "${dependencyName}" is not defined in the root package.json "catalogs.${catalogName}" object.`
        );
      }

      continue;
    }

    violations.push(
      `[${filePath}] ${sectionName} dependency "${dependencyName}" must use "${CATALOG_PREFIX}" (default catalog), "${CATALOG_PREFIX}<catalog-name>" (named catalog), or "${WORKSPACE_VALUE}", but found "${specifier}".`
    );
  }
};

const main = async () => {
  const { catalog, catalogs } = await loadRootCatalogInfo();
  const packageJsonPaths = await collectWorkspacePackageJsonPaths();
  const violations: string[] = [];

  for (const filePath of packageJsonPaths) {
    const packageJson = await readJsonFile<PackageJson>(filePath);

    validateDependencyRecord(
      "dependencies",
      packageJson.dependencies,
      filePath,
      catalog,
      catalogs,
      violations
    );

    validateDependencyRecord(
      "devDependencies",
      packageJson.devDependencies,
      filePath,
      catalog,
      catalogs,
      violations
    );

    validateDependencyRecord(
      "peerDependencies",
      packageJson.peerDependencies,
      filePath,
      catalog,
      catalogs,
      violations
    );

    validateDependencyRecord(
      "optionalDependencies",
      packageJson.optionalDependencies,
      filePath,
      catalog,
      catalogs,
      violations
    );
  }

  if (violations.length > 0) {
    console.error(
      "[pre-commit] Dependency catalog validation failed.\n" +
        'All workspace dependencies (except those with value "workspace:*") must refer to entries in the root package.json "catalog" using the "catalog:" syntax or in "catalogs" using the "catalog:<catalog-name>" syntax.\n\n' +
        "The following issues were found:\n\n" +
        violations.map((message) => `- ${message}`).join("\n") +
        "\n"
    );
    process.exit(1);
  }

  console.log(
    '[pre-commit] All workspace dependencies correctly reference the root catalog using "catalog:" or are marked as "workspace:*".'
  );
};

void main();

export {};

