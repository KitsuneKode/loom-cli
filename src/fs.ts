import os from "node:os";
import path from "node:path";
import { access, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(targetPath: string): Promise<boolean> {
  return (await stat(targetPath)).isDirectory();
}

export function resolveHome(input: string): string {
  if (input === "~") {
    return os.homedir();
  }

  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }

  return input;
}

export async function readTextFile(targetPath: string): Promise<string> {
  return await readFile(targetPath, "utf8");
}

export async function writeTextFile(targetPath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });

  const tempPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, contents, "utf8");
  await rename(tempPath, targetPath);
}

export async function appendUniqueLines(targetPath: string, lines: string[]): Promise<boolean> {
  const cleanedLines = [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
  if (cleanedLines.length === 0) {
    return false;
  }

  const existingContents = (await pathExists(targetPath)) ? await readTextFile(targetPath) : "";
  const existingLines = new Set(existingContents.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  const additions = cleanedLines.filter((line) => !existingLines.has(line));

  if (additions.length === 0) {
    return false;
  }

  const nextContents = existingContents.length === 0
    ? `${additions.join("\n")}\n`
    : `${existingContents.replace(/\s*$/, "")}\n${additions.join("\n")}\n`;

  await writeTextFile(targetPath, nextContents);
  return true;
}

export async function findUp(fileName: string, startDir: string): Promise<string | null> {
  let currentDir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(currentDir, fileName);
    if (await pathExists(candidate)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

export function resolveAgainstRoot(rootDir: string, input: string): string {
  const expandedInput = resolveHome(input);
  if (path.isAbsolute(expandedInput)) {
    return path.normalize(expandedInput);
  }

  return path.resolve(rootDir, expandedInput);
}

export function resolveTargetInput(input: string, cwd: string, destinationDir: string): string {
  const expandedInput = resolveHome(input);
  if (path.isAbsolute(expandedInput)) {
    return path.normalize(expandedInput);
  }

  if (cwd === destinationDir || cwd.startsWith(`${destinationDir}${path.sep}`)) {
    return path.resolve(cwd, input);
  }

  return path.resolve(cwd, input);
}

export async function resolveTargetInputs(inputs: string[], cwd: string, destinationDir: string): Promise<string[]> {
  return [...new Set(inputs.map((input) => resolveTargetInput(input, cwd, destinationDir)))];
}

export function normalizeRelative(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

export function isSubpath(rootDir: string, targetPath: string): boolean {
  const relativePath = path.relative(rootDir, targetPath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}
