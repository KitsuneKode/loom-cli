import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";

import { afterEach, expect, test } from "bun:test";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("loom init --write creates .loom.toml", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "loom-init-"));
  tempDirs.push(tempDir);

  const repoRoot = path.resolve(import.meta.dir, "..");
  const result = Bun.spawnSync({
    cmd: ["bun", "run", path.join(repoRoot, "src/bin/loom.ts"), "init", "--write"],
    cwd: tempDir,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

  expect(result.exitCode).toBe(0);

  const configContents = await readFile(path.join(tempDir, ".loom.toml"), "utf8");
  expect(configContents).toContain('engine = "chezmoi"');
  expect(configContents).toContain('ignore_file_name = ".loomignore"');
});
