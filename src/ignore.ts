import path from "node:path";

import { isDirectory, isSubpath, normalizeRelative, pathExists, readTextFile } from "./fs.ts";
import type { ActiveIgnoreFile, IgnoreMatch, IgnoreRule, ResolvedConfig } from "./types.ts";

function parseIgnorePatterns(contents: string): string[] {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function matchesPattern(pattern: string, absoluteTargetPath: string, scopeDir: string, targetIsDirectory: boolean): boolean {
  const normalizedPattern = pattern.replace(/^\.\//, "").replace(/\/$/, "");
  const relativePath = normalizeRelative(path.relative(scopeDir, absoluteTargetPath));

  if (relativePath === "" || relativePath.startsWith("..")) {
    return false;
  }

  if (normalizedPattern.includes("/")) {
    const matcher = new Bun.Glob(normalizedPattern);
    return matcher.match(relativePath) || (targetIsDirectory && matcher.match(`${relativePath}/`));
  }

  const baseName = path.basename(absoluteTargetPath);
  return new Bun.Glob(normalizedPattern).match(baseName) || new Bun.Glob(`**/${normalizedPattern}`).match(relativePath);
}

async function loadIgnoreFile(filePath: string, scopeDir: string): Promise<ActiveIgnoreFile> {
  return {
    path: filePath,
    scopeDir,
    patterns: parseIgnorePatterns(await readTextFile(filePath)),
  };
}

export async function listActiveIgnoreFiles(
  config: ResolvedConfig,
  absoluteTargetPath: string,
): Promise<ActiveIgnoreFile[]> {
  const ignoreFiles: ActiveIgnoreFile[] = [];
  const seen = new Set<string>();

  const repoIgnorePath = path.join(config.repoRoot, config.ignoreFileName);
  if (await pathExists(repoIgnorePath)) {
    ignoreFiles.push(await loadIgnoreFile(repoIgnorePath, config.destinationDir));
    seen.add(repoIgnorePath);
  }

  let startDir = absoluteTargetPath;
  if (!(await pathExists(absoluteTargetPath)) || !(await isDirectory(absoluteTargetPath))) {
    startDir = path.dirname(absoluteTargetPath);
  }

  if (!isSubpath(config.destinationDir, startDir)) {
    return ignoreFiles;
  }

  let currentDir = startDir;
  while (true) {
    const ignoreFilePath = path.join(currentDir, config.ignoreFileName);
    if (!seen.has(ignoreFilePath) && await pathExists(ignoreFilePath)) {
      ignoreFiles.push(await loadIgnoreFile(ignoreFilePath, currentDir));
      seen.add(ignoreFilePath);
    }

    if (currentDir === config.destinationDir) {
      break;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir || !isSubpath(config.destinationDir, parentDir)) {
      break;
    }

    currentDir = parentDir;
  }

  return ignoreFiles;
}

export async function getIgnoreMatches(
  config: ResolvedConfig,
  absoluteTargetPath: string,
): Promise<IgnoreMatch[]> {
  const ignoreFiles = await listActiveIgnoreFiles(config, absoluteTargetPath);
  const targetIsDirectory = (await pathExists(absoluteTargetPath)) ? await isDirectory(absoluteTargetPath) : false;
  const matches: IgnoreMatch[] = [];

  for (const ignoreFile of ignoreFiles) {
    for (const pattern of ignoreFile.patterns) {
      if (!matchesPattern(pattern, absoluteTargetPath, ignoreFile.scopeDir, targetIsDirectory)) {
        continue;
      }

      matches.push({
        path: absoluteTargetPath,
        ignoreFile: ignoreFile.path,
        scopeDir: ignoreFile.scopeDir,
        pattern,
      });
    }
  }

  return matches;
}

export function renderIgnoreSummary(rules: IgnoreRule[]): string[] {
  return rules.map((rule) => `${rule.ignoreFile}: ${rule.pattern}`);
}
