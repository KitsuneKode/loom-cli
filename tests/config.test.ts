import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";

import { afterEach, expect, test } from "bun:test";

import { loadConfig } from "../src/config.ts";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("loadConfig finds ancestor config and resolves paths", async () => {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), "loom-config-"));
  tempDirs.push(repoRoot);

  const nestedDir = path.join(repoRoot, "packages", "demo");
  await mkdir(nestedDir, { recursive: true });
  await writeFile(
    path.join(repoRoot, ".loom.toml"),
    [
      "version = 1",
      'engine = "chezmoi"',
      'source = "."',
      'destination = "~"',
      "",
      "[commands]",
      'chezmoi = "chezmoi"',
      'git = "git"',
      "",
      "[safety]",
      "preview_first = true",
      "",
    ].join("\n"),
    "utf8",
  );

  const config = await loadConfig(nestedDir);
  expect(config.repoRoot).toBe(repoRoot);
  expect(config.sourceDir).toBe(repoRoot);
  expect(config.destinationDir).toBe(os.homedir());
  expect(config.ignoreFileName).toBe(".loomignore");
});
