type DependencyRecord = Record<string, string>;

type PackageJson = {
  name?: string;
  version?: string;
  private?: boolean;
  workspaces?: string[];
  catalog?: Record<string, string>;
  catalogs?: Record<string, Record<string, string>>;
  dependencies?: DependencyRecord;
  devDependencies?: DependencyRecord;
  peerDependencies?: DependencyRecord;
  optionalDependencies?: DependencyRecord;
};

type DependencySectionName =
  | "dependencies"
  | "devDependencies"
  | "peerDependencies"
  | "optionalDependencies";

const ROOT_PACKAGE_JSON_PATH = "package.json" as const;
const CONFIG_TS_PACKAGE_JSON_PATH = "config/ts/package.json";

const CATALOG_PREFIX = "catalog:";
const WORKSPACE_VALUE = "workspace:*";

const DEPENDENCY_SECTION_NAMES: DependencySectionName[] = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

const readJsonFile = async <T>(path: string): Promise<T> => {
  const file = Bun.file(path);

  if (!(await file.exists())) {
    console.error(
      `[migrate-catalog] Missing JSON file at "${path}". Please restore it before running the migration.`
    );
    process.exit(1);
  }

  try {
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch {
    console.error(
      `[migrate-catalog] Failed to read or parse "${path}" as JSON.`
    );
    process.exit(1);
  }
};

const writeJsonFile = async (path: string, value: unknown) => {
  const json = JSON.stringify(value, null, 2);
  await Bun.write(path, `${json}\n`);
};

const collectPackageJsonPaths = async (): Promise<string[]> => {
  const glob = new Bun.Glob("**/package.json");
  const paths: string[] = [];

  for await (const path of glob.scan(".")) {
    if (path.includes("node_modules/") || path.includes("/.git/")) {
      continue;
    }

    const normalizedPath = path.startsWith("./") ? path.slice(2) : path;
    paths.push(normalizedPath);
  }

  return paths;
};

const getDependencySections = (
  pkg: PackageJson
): [DependencySectionName, DependencyRecord | undefined][] => {
  return DEPENDENCY_SECTION_NAMES.map((name) => [
    name,
    pkg[name] as DependencyRecord | undefined,
  ]);
};

const main = async () => {
  const packageJsonPaths = await collectPackageJsonPaths();

  if (!packageJsonPaths.includes(ROOT_PACKAGE_JSON_PATH)) {
    console.error(
      `[migrate-catalog] Could not find "${ROOT_PACKAGE_JSON_PATH}". Please run this script from the workspace root.`
    );
    process.exit(1);
  }

  const packages = new Map<string, PackageJson>();

  for (const path of packageJsonPaths) {
    const pkg = await readJsonFile<PackageJson>(path);
    packages.set(path, pkg);
  }

  const rootPackageJson = packages.get(ROOT_PACKAGE_JSON_PATH);

  if (!rootPackageJson) {
    console.error(
      "[migrate-catalog] Failed to load required package.json files."
    );
    process.exit(1);
  }

  const configTsPackageJson = packages.get(CONFIG_TS_PACKAGE_JSON_PATH);

  const catalog: Record<string, string> = {
    ...(rootPackageJson.catalog ?? {}),
  };

  const catalogs: Record<string, Record<string, string>> = {};

  for (const [name, group] of Object.entries(rootPackageJson.catalogs ?? {})) {
    catalogs[name] = { ...group };
  }

  const existingConfigDependencies: DependencyRecord = {
    ...(configTsPackageJson?.dependencies ?? {}),
  };

  const workspacePackageNames = new Set<string>();

  for (const pkg of packages.values()) {
    if (pkg.name) {
      workspacePackageNames.add(pkg.name);
    }
  }

  // Seed catalog from config/ts dependencies if not already present in root catalog.
  for (const [depName, version] of Object.entries(existingConfigDependencies)) {
    if (!Object.prototype.hasOwnProperty.call(catalog, depName)) {
      catalog[depName] = version;
    }
  }

  const missingDefaultCatalogEntries: string[] = [];
  const missingNamedCatalogEntries: string[] = [];
  const missingWorkspaceDependencies: string[] = [];
  const changedPackagePaths = new Set<string>();

  for (const [path, pkg] of packages.entries()) {
    const isRootPackageJson = path === ROOT_PACKAGE_JSON_PATH;
    const isConfigTsPackageJson = path === CONFIG_TS_PACKAGE_JSON_PATH;

    const sections = getDependencySections(pkg);

    for (const [sectionName, record] of sections) {
      if (!record) {
        continue;
      }

      // Only rewrite versions to "catalog:" in non-config packages.
      const shouldMigrateThisFile = !isConfigTsPackageJson;

      for (const [dependencyName, rawSpecifier] of Object.entries(record)) {
        const specifier = rawSpecifier.trim();

        if (specifier === WORKSPACE_VALUE) {
          if (!workspacePackageNames.has(dependencyName)) {
            missingWorkspaceDependencies.push(
              `${path} -> ${sectionName} -> ${dependencyName}: uses "${WORKSPACE_VALUE}" but no workspace package with name "${dependencyName}" was found.`
            );
          }

          continue;
        }

        // Default catalog reference: "catalog:"
        if (specifier === CATALOG_PREFIX) {
          if (!Object.prototype.hasOwnProperty.call(catalog, dependencyName)) {
            const versionFromConfig =
              existingConfigDependencies[dependencyName] ?? undefined;

            if (!versionFromConfig) {
              missingDefaultCatalogEntries.push(
                `${path} -> ${sectionName} -> ${dependencyName}: uses "${CATALOG_PREFIX}" but "${dependencyName}" is not defined in the root package.json "catalog" field or in ${CONFIG_TS_PACKAGE_JSON_PATH}.`
              );
              continue;
            }

            catalog[dependencyName] = versionFromConfig;
          }

          continue;
        }

        // Named catalog reference: "catalog:<name>"
        if (specifier.startsWith(CATALOG_PREFIX)) {
          const catalogName = specifier.slice(CATALOG_PREFIX.length);

          if (!catalogName) {
            // Handled above as default catalog.
            continue;
          }

          const existingGroup =
            rootPackageJson.catalogs?.[catalogName] ?? undefined;

          const group =
            catalogs[catalogName] ??
            (catalogs[catalogName] = { ...(existingGroup ?? {}) });

          if (!Object.prototype.hasOwnProperty.call(group, dependencyName)) {
            const versionFromConfig =
              existingConfigDependencies[dependencyName] ?? undefined;

            if (!versionFromConfig) {
              missingNamedCatalogEntries.push(
                `${path} -> ${sectionName} -> ${dependencyName}: uses "${specifier}" but "${dependencyName}" is not defined in root package.json "catalogs.${catalogName}" or in ${CONFIG_TS_PACKAGE_JSON_PATH}.`
              );
              continue;
            }

            group[dependencyName] = versionFromConfig;
          }

          continue;
        }

        // Non-catalog, non-workspace dependency: migrate to default catalog.
        if (!shouldMigrateThisFile) {
          continue;
        }

        let catalogVersion = catalog[dependencyName];

        if (!catalogVersion) {
          catalogVersion =
            existingConfigDependencies[dependencyName] || specifier;

          catalog[dependencyName] = catalogVersion;
        }

        record[dependencyName] = CATALOG_PREFIX;
        changedPackagePaths.add(path);
      }
    }
  }

  if (missingDefaultCatalogEntries.length > 0) {
    console.error(
      "[migrate-catalog] Unable to complete migration because some default catalog references do not have a concrete version.\n" +
        `Please define versions for the following dependencies in the root package.json "catalog" field or in "${CONFIG_TS_PACKAGE_JSON_PATH}" and re-run the script:\n\n` +
        missingDefaultCatalogEntries.map((entry) => `- ${entry}`).join("\n") +
        "\n"
    );
    process.exit(1);
  }

  if (missingNamedCatalogEntries.length > 0) {
    console.error(
      "[migrate-catalog] Unable to complete migration because some named catalog references do not have a concrete version.\n" +
        `Please define versions for the following dependencies in the appropriate root package.json "catalogs" entry or in "${CONFIG_TS_PACKAGE_JSON_PATH}" and re-run the script:\n\n` +
        missingNamedCatalogEntries.map((entry) => `- ${entry}`).join("\n") +
        "\n"
    );
    process.exit(1);
  }

  if (missingWorkspaceDependencies.length > 0) {
    console.error(
      '[migrate-catalog] Unable to complete migration because some dependencies use "workspace:*" but the corresponding workspace package could not be found.\n' +
        "Please ensure that each dependency name exists as the `name` field of a workspace package.json:\n\n" +
        missingWorkspaceDependencies.map((entry) => `- ${entry}`).join("\n") +
        "\n"
    );
    process.exit(1);
  }

  // Sync root catalog with the computed catalog map.
  rootPackageJson.catalog = catalog;
  if (Object.keys(catalogs).length > 0) {
    rootPackageJson.catalogs = catalogs;
  }
  changedPackagePaths.add(ROOT_PACKAGE_JSON_PATH);

  for (const path of changedPackagePaths) {
    const pkg = packages.get(path);

    if (!pkg) {
      continue;
    }

    await writeJsonFile(path, pkg);
  }

  console.log(
    '[migrate-catalog] Migration complete. All non-config workspace dependencies now use default or named Bun catalogs ("catalog:" / "catalog:<name>") where applicable (except those using "workspace:*"), and all referenced catalog entries have concrete versions in the root package.json "catalog" / "catalogs" fields.'
  );
};

void main();

export {};

