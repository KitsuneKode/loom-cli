import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";

import { afterEach, expect, test } from "bun:test";

import { getIgnoreMatches } from "../src/ignore.ts";
import type { ResolvedConfig } from "../src/types.ts";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("distributed ignore files apply to their subtree", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "loom-ignore-"));
  tempDirs.push(tempRoot);

  const repoRoot = path.join(tempRoot, "repo");
  const destinationDir = path.join(tempRoot, "home");
  const scopeDir = path.join(destinationDir, ".config", "hypr");
  const targetPath = path.join(scopeDir, "shaders", ".compiled.cache.glsl");

  await mkdir(path.dirname(targetPath), { recursive: true });
  await mkdir(repoRoot, { recursive: true });
  await writeFile(path.join(scopeDir, ".loomignore"), "shaders/.compiled.cache.glsl\n", "utf8");
  await writeFile(targetPath, "compiled", "utf8");

  const config: ResolvedConfig = {
    version: 1,
    engine: "chezmoi",
    repoRoot,
    configPath: path.join(repoRoot, ".loom.toml"),
    source: ".",
    sourceDir: repoRoot,
    destination: "~",
    destinationDir,
    ignoreFileName: ".loomignore",
    commands: {
      chezmoi: "chezmoi",
      git: "git",
    },
    safety: {
      previewFirst: true,
    },
  };

  const matches = await getIgnoreMatches(config, targetPath);
  expect(matches).toHaveLength(1);
  expect(matches[0]?.pattern).toBe("shaders/.compiled.cache.glsl");
});

test("repo-root ignore files apply across the destination tree", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "loom-ignore-root-"));
  tempDirs.push(tempRoot);

  const repoRoot = path.join(tempRoot, "repo");
  const destinationDir = path.join(tempRoot, "home");
  const targetPath = path.join(destinationDir, ".cache", "tool", "state.json");

  await mkdir(path.dirname(targetPath), { recursive: true });
  await mkdir(repoRoot, { recursive: true });
  await writeFile(path.join(repoRoot, ".loomignore"), ".cache/**\n", "utf8");
  await writeFile(targetPath, "{}", "utf8");

  const config: ResolvedConfig = {
    version: 1,
    engine: "chezmoi",
    repoRoot,
    configPath: path.join(repoRoot, ".loom.toml"),
    source: ".",
    sourceDir: repoRoot,
    destination: "~",
    destinationDir,
    ignoreFileName: ".loomignore",
    commands: {
      chezmoi: "chezmoi",
      git: "git",
    },
    safety: {
      previewFirst: true,
    },
  };

  const matches = await getIgnoreMatches(config, targetPath);
  expect(matches).toHaveLength(1);
  expect(matches[0]?.ignoreFile).toBe(path.join(repoRoot, ".loomignore"));
});
