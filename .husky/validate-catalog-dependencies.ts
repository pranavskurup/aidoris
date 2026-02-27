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

const loadRootCatalog = async (): Promise<Record<string, string>> => {
  const rootPackageJson = await readJsonFile<PackageJson>(
    ROOT_PACKAGE_JSON_PATH
  );
  const catalog = rootPackageJson.catalog ?? {};

  if (Object.keys(catalog).length === 0) {
    console.error(
      '[pre-commit] Root package.json does not define any "catalog" entries.\n' +
        'Please define a "catalog" object and reference it from workspace dependencies.'
    );
    process.exit(1);
  }

  return catalog;
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
  catalog: Record<string, string>,
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

    if (specifier.startsWith(CATALOG_PREFIX)) {
      const catalogKey = specifier.slice(CATALOG_PREFIX.length);

      if (!catalogKey) {
        violations.push(
          `[${filePath}] ${sectionName} dependency "${dependencyName}" is using "${CATALOG_PREFIX}" without a key. Expected "${CATALOG_PREFIX}<catalog-key>".`
        );
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(catalog, catalogKey)) {
        violations.push(
          `[${filePath}] ${sectionName} dependency "${dependencyName}" references catalog key "${catalogKey}" which is not defined in the root package.json "catalog" object.`
        );
      }

      continue;
    }

    violations.push(
      `[${filePath}] ${sectionName} dependency "${dependencyName}" must use "${CATALOG_PREFIX}<catalog-key>" or "${WORKSPACE_VALUE}", but found "${specifier}".`
    );
  }
};

const main = async () => {
  const catalog = await loadRootCatalog();
  const packageJsonPaths = await collectWorkspacePackageJsonPaths();
  const violations: string[] = [];

  for (const filePath of packageJsonPaths) {
    const packageJson = await readJsonFile<PackageJson>(filePath);

    validateDependencyRecord(
      "dependencies",
      packageJson.dependencies,
      filePath,
      catalog,
      violations
    );

    validateDependencyRecord(
      "devDependencies",
      packageJson.devDependencies,
      filePath,
      catalog,
      violations
    );

    validateDependencyRecord(
      "peerDependencies",
      packageJson.peerDependencies,
      filePath,
      catalog,
      violations
    );

    validateDependencyRecord(
      "optionalDependencies",
      packageJson.optionalDependencies,
      filePath,
      catalog,
      violations
    );
  }

  if (violations.length > 0) {
    console.error(
      "[pre-commit] Dependency catalog validation failed.\n" +
        'All workspace dependencies (except those with value "workspace:*") must refer to entries in the root package.json "catalog" using the "catalog:<key>" syntax.\n\n' +
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

