type DependencyRecord = Record<string, string>;

type PackageJson = {
  name?: string;
  version?: string;
  private?: boolean;
  workspaces?: string[];
  catalog?: Record<string, string>;
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

  const missingCatalogKeys: string[] = [];
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

      // Never rewrite versions in config/ts/package.json – it is the source of truth for versions.
      const shouldMigrateThisFile =
        !isConfigTsPackageJson || isRootPackageJson;

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

        if (specifier.startsWith(CATALOG_PREFIX)) {
          const catalogKey = specifier.slice(CATALOG_PREFIX.length).trim();

          if (!catalogKey) {
            missingCatalogKeys.push(
              `${path} -> ${sectionName} -> ${dependencyName}: uses "${CATALOG_PREFIX}" without a key.`
            );
            continue;
          }

          if (!Object.prototype.hasOwnProperty.call(catalog, catalogKey)) {
            const versionFromConfig =
              existingConfigDependencies[catalogKey] ?? undefined;

            if (!versionFromConfig) {
              missingCatalogKeys.push(
                `${path} -> ${sectionName} -> ${dependencyName}: references catalog key "${catalogKey}" but no version is defined in root catalog or in ${CONFIG_TS_PACKAGE_JSON_PATH}.`
              );
              continue;
            }

            catalog[catalogKey] = versionFromConfig;
          }

          continue;
        }

        if (!shouldMigrateThisFile) {
          continue;
        }

        const catalogKey = dependencyName;

        let catalogVersion = catalog[catalogKey];

        if (!catalogVersion) {
          catalogVersion =
            existingConfigDependencies[catalogKey] || specifier;

          catalog[catalogKey] = catalogVersion;
        }

        record[dependencyName] = `${CATALOG_PREFIX}${catalogKey}`;
        changedPackagePaths.add(path);
      }
    }
  }

  if (missingCatalogKeys.length > 0) {
    console.error(
      "[migrate-catalog] Unable to complete migration because some existing catalog references do not have a concrete version.\n" +
        `Please define versions for the following catalog keys in "${CONFIG_TS_PACKAGE_JSON_PATH}" and re-run the script:\n\n` +
        missingCatalogKeys.map((entry) => `- ${entry}`).join("\n") +
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
  changedPackagePaths.add(ROOT_PACKAGE_JSON_PATH);

  for (const path of changedPackagePaths) {
    const pkg = packages.get(path);

    if (!pkg) {
      continue;
    }

    await writeJsonFile(path, pkg);
  }

  console.log(
    '[migrate-catalog] Migration complete. All dependencies now use "catalog:" (except those using "workspace:*"), and catalog versions are synced with "config/ts/package.json".'
  );
};

void main();

export {};

