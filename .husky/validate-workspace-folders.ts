type WorkspaceFolder = {
  path: string;
};

type WorkspaceConfig = {
  folders?: WorkspaceFolder[];
};

const EXPECTED_WORKTREE_WORKSPACE_FOLDERS: WorkspaceFolder[] = [
  { path: "../../main" },
  { path: "../../develop" },
];

const EXPECTED_MAIN_WORKSPACE_FOLDERS: WorkspaceFolder[] = [{ path: "." }];

const validateWorkspaceFile = async (
  workspacePath: string,
  expectedFolders: WorkspaceFolder[]
) => {
  const workspaceFile = Bun.file(workspacePath);

  if (!(await workspaceFile.exists())) {
    console.error(
      `[pre-commit] Missing workspace file at "${workspacePath}". Please restore it before committing.`
    );
    process.exit(1);
  }

  let parsedConfig: WorkspaceConfig | undefined;

  try {
    const fileContents = await workspaceFile.text();
    parsedConfig = JSON.parse(fileContents) as WorkspaceConfig;
  } catch (error) {
    console.error(
      "[pre-commit] Failed to read or parse .config/aidoris.worktree.code-workspace as JSON."
    );
    process.exit(1);
  }

  const currentFolders = parsedConfig?.folders;

  const hasValidFolders =
    Array.isArray(currentFolders) &&
    currentFolders.length === expectedFolders.length &&
    currentFolders.every((folder, index) => {
      const expectedFolder = expectedFolders[index];

      if (!folder || typeof folder.path !== "string") {
        return false;
      }

      return folder.path === expectedFolder.path;
    });

  if (!hasValidFolders) {
    console.error(
      `[pre-commit] The \`folders\` value in ${workspacePath} has been modified.\n` +
        "It must remain exactly:\n\n" +
        JSON.stringify({ folders: expectedFolders }, null, 2) +
        "\n\nPlease revert any changes to this file before committing."
    );
    process.exit(1);
  }
};

const main = async () => {
  await validateWorkspaceFile(
    ".config/aidoris.worktree.code-workspace",
    EXPECTED_WORKTREE_WORKSPACE_FOLDERS
  );

  await validateWorkspaceFile(
    ".config/aidoris.code-workspace",
    EXPECTED_MAIN_WORKSPACE_FOLDERS
  );
};

void main();

