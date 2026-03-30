export const APP_NAME = "loom";
export const APP_VERSION = "0.1.0";
export const CONFIG_FILE_NAME = ".loom.toml";
export const DEFAULT_ENGINE = "chezmoi";
export const DEFAULT_IGNORE_FILE_NAME = ".loomignore";

export function renderDefaultConfig(options?: {
  source?: string;
  destination?: string;
  ignoreFileName?: string;
}): string {
  const source = options?.source ?? ".";
  const destination = options?.destination ?? "~";
  const ignoreFileName = options?.ignoreFileName ?? DEFAULT_IGNORE_FILE_NAME;

  return [
    "version = 1",
    `engine = "${DEFAULT_ENGINE}"`,
    `source = "${source}"`,
    `destination = "${destination}"`,
    `ignore_file_name = "${ignoreFileName}"`,
    "",
    "[commands]",
    'chezmoi = "chezmoi"',
    'git = "git"',
    "",
    "[safety]",
    "preview_first = true",
    "",
  ].join("\n");
}
