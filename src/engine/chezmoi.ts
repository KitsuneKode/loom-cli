import os from "node:os";
import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";

import type { LoomStatusEntry, ResolvedConfig } from "../types.ts";

const decoder = new TextDecoder();

export interface CommandOutput {
  cmd: string[];
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runChezmoi(
  config: ResolvedConfig,
  args: string[],
  options?: {
    acceptExitCodes?: number[];
  },
): Promise<CommandOutput> {
  const acceptExitCodes = options?.acceptExitCodes ?? [0];
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "loom-chezmoi-"));
  const tempConfigPath = path.join(tempDir, "chezmoi.toml");

  await writeFile(tempConfigPath, "[warnings]\nconfigFileTemplateHasChanged = false\n", "utf8");

  const cmd = [
    config.commands.chezmoi,
    "-c",
    tempConfigPath,
    "-S",
    config.sourceDir,
    "-D",
    config.destinationDir,
    ...args,
  ];

  try {
    const result = Bun.spawnSync({
      cmd,
      cwd: config.repoRoot,
      stdout: "pipe",
      stderr: "pipe",
      env: process.env,
    });

    const output = {
      cmd,
      stdout: decoder.decode(result.stdout),
      stderr: decoder.decode(result.stderr),
      exitCode: result.exitCode,
    };

    if (!acceptExitCodes.includes(output.exitCode)) {
      const message = [output.stderr.trim(), output.stdout.trim(), `${config.commands.chezmoi} failed.`]
        .filter(Boolean)
        .join("\n");
      throw new Error(message);
    }

    return output;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export function parseStatusLine(line: string): LoomStatusEntry | null {
  if (line.length < 4) {
    return null;
  }

  const actualDiff = line[0] ?? " ";
  const targetDiff = line[1] ?? " ";
  const targetPath = line.slice(3).trim();

  if (!targetPath) {
    return null;
  }

  return {
    actualDiff,
    targetDiff,
    path: targetPath,
  };
}

export async function getStatus(config: ResolvedConfig, targets: string[] = []): Promise<LoomStatusEntry[]> {
  const result = await runChezmoi(config, ["status", "--path-style", "absolute", ...targets]);
  return result.stdout
    .split(/\r?\n/)
    .map((line) => parseStatusLine(line))
    .filter((entry): entry is LoomStatusEntry => entry !== null);
}

export async function getDiff(config: ResolvedConfig, targets: string[] = []): Promise<string> {
  const result = await runChezmoi(config, ["diff", ...targets], { acceptExitCodes: [0, 1] });
  return result.stdout;
}

export async function getSourcePath(config: ResolvedConfig, target: string): Promise<string | null> {
  const result = await runChezmoi(config, ["source-path", target], { acceptExitCodes: [0, 1] });
  const sourcePath = result.stdout.trim();
  return sourcePath.length > 0 ? sourcePath : null;
}

export async function getManaged(config: ResolvedConfig): Promise<string[]> {
  const result = await runChezmoi(config, ["managed", "--path-style", "absolute"]);
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export async function getUnmanaged(config: ResolvedConfig, targets: string[] = []): Promise<string[]> {
  const result = await runChezmoi(config, ["unmanaged", "--path-style", "absolute", ...targets]);
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export async function reAdd(config: ResolvedConfig, targets: string[], dryRun = false): Promise<void> {
  const args = [...(dryRun ? ["-n"] : []), "re-add", ...targets];
  await runChezmoi(config, args);
}

export async function addTargets(
  config: ResolvedConfig,
  targets: string[],
  options?: {
    dryRun?: boolean;
    template?: boolean;
    encrypt?: boolean;
    exact?: boolean;
    follow?: boolean;
    createNew?: boolean;
  },
): Promise<void> {
  const flags: string[] = [];
  if (options?.template) flags.push("--template");
  if (options?.encrypt) flags.push("--encrypt");
  if (options?.exact) flags.push("--exact");
  if (options?.follow) flags.push("--follow");
  if (options?.createNew) flags.push("--new");

  const args = [...(options?.dryRun ? ["-n"] : []), "add", ...flags, ...targets];
  await runChezmoi(config, args);
}

export async function forgetTargets(config: ResolvedConfig, targets: string[], dryRun = false): Promise<void> {
  const args = [...(dryRun ? ["-n"] : []), "forget", ...targets];
  await runChezmoi(config, args);
}

export async function applyTargets(config: ResolvedConfig, targets: string[], dryRun = false): Promise<void> {
  const args = [...(dryRun ? ["-n"] : []), "apply", ...targets];
  await runChezmoi(config, args);
}
