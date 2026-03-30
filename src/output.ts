import path from "node:path";

import type {
  ActiveIgnoreFile,
  DiscoverResult,
  InspectRecord,
  LoomStatusEntry,
  ResolvedConfig,
  TrackPlan,
} from "./types.ts";

function color(code: number, text: string): string {
  return process.stdout.isTTY ? `\u001B[${code}m${text}\u001B[0m` : text;
}

export function green(text: string): string {
  return color(32, text);
}

export function yellow(text: string): string {
  return color(33, text);
}

export function blue(text: string): string {
  return color(34, text);
}

export function red(text: string): string {
  return color(31, text);
}

export function dim(text: string): string {
  return color(2, text);
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function formatStatus(entry: LoomStatusEntry): string {
  const flags = `${entry.actualDiff}${entry.targetDiff}`;
  const templateSuffix = entry.templateBacked && entry.sourcePath ? dim(` (${entry.sourcePath})`) : "";
  return `${flags} ${entry.path}${templateSuffix}`;
}

export function renderDoctor(
  config: ResolvedConfig,
  details: {
    chezmoiPath: string | null;
    gitPath: string | null;
    managedCount: number;
  },
): void {
  process.stdout.write(`${blue("loom doctor")}\n`);
  process.stdout.write(`repo root: ${config.repoRoot}\n`);
  process.stdout.write(`config path: ${config.configPath}\n`);
  process.stdout.write(`source dir: ${config.sourceDir}\n`);
  process.stdout.write(`destination dir: ${config.destinationDir}\n`);
  process.stdout.write(`ignore file: ${config.ignoreFileName}\n`);
  process.stdout.write(`chezmoi: ${details.chezmoiPath ?? red("not found")}\n`);
  process.stdout.write(`git: ${details.gitPath ?? red("not found")}\n`);
  process.stdout.write(`managed paths: ${details.managedCount}\n`);
  process.stdout.write(`preview first: ${config.safety.previewFirst ? green("yes") : yellow("no")}\n`);
}

export function renderStatus(entries: LoomStatusEntry[]): void {
  if (entries.length === 0) {
    process.stdout.write(`${green("No managed changes detected.")}\n`);
    return;
  }

  for (const entry of entries) {
    process.stdout.write(`${formatStatus(entry)}\n`);
  }
}

export function renderDiscover(result: DiscoverResult): void {
  if (
    result.managedDrift.length === 0 &&
    result.templateBlocked.length === 0 &&
    result.applyDrift.length === 0 &&
    result.unmanaged.length === 0 &&
    result.ignored.length === 0
  ) {
    process.stdout.write(`${green("Nothing interesting found.")}\n`);
    return;
  }

  if (result.managedDrift.length > 0) {
    process.stdout.write(`${blue("Managed live drift")}\n`);
    for (const entry of result.managedDrift) {
      process.stdout.write(`- ${formatStatus(entry)}\n`);
    }
  }

  if (result.templateBlocked.length > 0) {
    process.stdout.write(`${yellow("Template-backed live drift")}\n`);
    for (const entry of result.templateBlocked) {
      process.stdout.write(`- ${formatStatus(entry)}\n`);
    }
  }

  if (result.applyDrift.length > 0) {
    process.stdout.write(`${blue("Repo-to-live apply drift")}\n`);
    for (const entry of result.applyDrift) {
      process.stdout.write(`- ${formatStatus(entry)}\n`);
    }
  }

  if (result.unmanaged.length > 0) {
    process.stdout.write(`${yellow("Unmanaged candidates")}\n`);
    for (const entry of result.unmanaged) {
      process.stdout.write(`- ${entry}\n`);
    }
  }

  if (result.ignored.length > 0) {
    process.stdout.write(`${dim("Ignored candidates")}\n`);
    for (const match of result.ignored) {
      process.stdout.write(`- ${match.path} ${dim(`(${match.pattern} via ${match.ignoreFile})`)}\n`);
    }
  }
}

export function renderInspect(records: InspectRecord[]): void {
  for (const record of records) {
    process.stdout.write(`${blue(record.absolutePath)}\n`);
    process.stdout.write(`  managed: ${record.managed ? green("yes") : yellow("no")}\n`);
    process.stdout.write(`  exists: ${record.exists ? green("yes") : yellow("no")}\n`);
    process.stdout.write(`  type: ${record.directory ? "directory" : "file"}\n`);
    process.stdout.write(`  source: ${record.sourcePath ?? dim("not managed")}\n`);
    process.stdout.write(`  template: ${record.templateBacked ? yellow("yes") : "no"}\n`);
    process.stdout.write(`  next: ${record.recommendedAction}\n`);

    if (record.status) {
      process.stdout.write(`  status: ${record.status.actualDiff}${record.status.targetDiff}\n`);
    }

    if (record.ignored.length > 0) {
      process.stdout.write("  ignored by:\n");
      for (const match of record.ignored) {
        process.stdout.write(`    - ${match.pattern} (${match.ignoreFile})\n`);
      }
    }
  }
}

export function renderPullPreview(entries: LoomStatusEntry[], templateBlocked: LoomStatusEntry[]): void {
  if (entries.length === 0 && templateBlocked.length === 0) {
    process.stdout.write(`${green("No pullable live changes detected.")}\n`);
    return;
  }

  if (entries.length > 0) {
    process.stdout.write(`${blue("Would sync back")}\n`);
    for (const entry of entries) {
      process.stdout.write(`- ${entry.path}\n`);
    }
  }

  if (templateBlocked.length > 0) {
    process.stdout.write(`${yellow("Needs source edits")}\n`);
    for (const entry of templateBlocked) {
      process.stdout.write(`- ${entry.path} -> ${entry.sourcePath}\n`);
    }
  }
}

export function renderApplyPreview(entries: LoomStatusEntry[]): void {
  if (entries.length === 0) {
    process.stdout.write(`${green("No repo-to-live changes to apply.")}\n`);
    return;
  }

  process.stdout.write(`${blue("Would apply")}\n`);
  for (const entry of entries) {
    process.stdout.write(`- ${entry.path}\n`);
  }
}

export function renderTrackPlans(plans: TrackPlan[]): void {
  if (plans.length === 0) {
    process.stdout.write(`${yellow("Nothing selected for tracking.")}\n`);
    return;
  }

  process.stdout.write(`${blue("Track plan")}\n`);
  for (const plan of plans) {
    const flagText = plan.chezmoiFlags.length > 0 ? ` ${dim(plan.chezmoiFlags.join(" "))}` : "";
    process.stdout.write(`- ${plan.absolutePath}${flagText}\n`);
    process.stdout.write(`  mode: ${plan.mode}\n`);
    process.stdout.write(`  reason: ${plan.reason}\n`);
  }
}

export function renderIgnoreFiles(ignoreFiles: ActiveIgnoreFile[]): void {
  if (ignoreFiles.length === 0) {
    process.stdout.write(`${yellow("No active ignore files.")}\n`);
    return;
  }

  for (const ignoreFile of ignoreFiles) {
    const scopeLabel = ignoreFile.scopeDir === path.dirname(ignoreFile.path)
      ? ignoreFile.scopeDir
      : `${ignoreFile.scopeDir} ${dim(`[via ${ignoreFile.path}]`)}`;
    process.stdout.write(`${blue(ignoreFile.path)}\n`);
    process.stdout.write(`  scope: ${scopeLabel}\n`);
    if (ignoreFile.patterns.length === 0) {
      process.stdout.write(`  patterns: ${dim("none")}\n`);
      continue;
    }

    for (const pattern of ignoreFile.patterns) {
      process.stdout.write(`  - ${pattern}\n`);
    }
  }
}
