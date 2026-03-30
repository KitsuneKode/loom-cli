import path from "node:path";
import { z } from "zod";

import { CONFIG_FILE_NAME, DEFAULT_ENGINE, DEFAULT_IGNORE_FILE_NAME, renderDefaultConfig } from "./constants.ts";
import { findUp, readTextFile, resolveAgainstRoot } from "./fs.ts";
import type { LoomConfigFile, ResolvedConfig } from "./types.ts";

const configSchema = z.object({
  version: z.number().int().positive().optional(),
  engine: z.string().optional(),
  source: z.string().optional(),
  destination: z.string().optional(),
  ignore_file_name: z.string().optional(),
  commands: z.object({
    chezmoi: z.string().optional(),
    git: z.string().optional(),
  }).optional(),
  safety: z.object({
    preview_first: z.boolean().optional(),
  }).optional(),
});

function parseConfig(contents: string): LoomConfigFile {
  const parsed = Bun.TOML.parse(contents);
  return configSchema.parse(parsed ?? {}) as LoomConfigFile;
}

export async function loadConfig(cwd: string, explicitPath?: string): Promise<ResolvedConfig> {
  const configPath = explicitPath
    ? resolveAgainstRoot(cwd, explicitPath)
    : await findUp(CONFIG_FILE_NAME, cwd);

  if (!configPath) {
    throw new Error(`No ${CONFIG_FILE_NAME} found. Run \`loom init --write\` from your repo root.`);
  }

  const raw = parseConfig(await readTextFile(configPath));
  const engine = raw.engine ?? DEFAULT_ENGINE;
  if (engine !== DEFAULT_ENGINE) {
    throw new Error(`Unsupported engine: ${engine}`);
  }

  const repoRoot = path.dirname(configPath);
  const source = raw.source ?? ".";
  const destination = raw.destination ?? "~";

  return {
    version: raw.version ?? 1,
    engine,
    repoRoot,
    configPath,
    source,
    sourceDir: resolveAgainstRoot(repoRoot, source),
    destination,
    destinationDir: resolveAgainstRoot(repoRoot, destination),
    ignoreFileName: raw.ignore_file_name ?? DEFAULT_IGNORE_FILE_NAME,
    commands: {
      chezmoi: raw.commands?.chezmoi ?? "chezmoi",
      git: raw.commands?.git ?? "git",
    },
    safety: {
      previewFirst: raw.safety?.preview_first ?? true,
    },
  };
}

export function renderConfigTemplate(options?: {
  source?: string;
  destination?: string;
  ignoreFileName?: string;
}): string {
  return renderDefaultConfig(options);
}
