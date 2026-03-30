import path from "node:path";

import { assertNoUnexpectedFlags, consumeBooleanFlag, consumeStringFlag } from "./args.ts";
import { loadConfig, renderConfigTemplate } from "./config.ts";
import { APP_NAME, APP_VERSION, CONFIG_FILE_NAME, DEFAULT_IGNORE_FILE_NAME } from "./constants.ts";
import { discover, diffPreview, enrichStatusEntries, inspectPaths } from "./discovery.ts";
import { addTargets, applyTargets, forgetTargets, getManaged, getSourcePath, getStatus, reAdd } from "./engine/chezmoi.ts";
import { appendUniqueLines, isSubpath, pathExists, resolveTargetInput, resolveTargetInputs, writeTextFile } from "./fs.ts";
import { listActiveIgnoreFiles } from "./ignore.ts";
import {
  blue,
  green,
  printJson,
  red,
  renderApplyPreview,
  renderDiscover,
  renderDoctor,
  renderIgnoreFiles,
  renderInspect,
  renderPullPreview,
  renderStatus,
  renderTrackPlans,
  yellow,
} from "./output.ts";
import { promptTrackMode } from "./prompt.ts";
import type { ResolvedConfig, TrackMode, TrackPlan } from "./types.ts";

function printHelp(): void {
  process.stdout.write(`${APP_NAME} ${APP_VERSION}\n\n`);
  process.stdout.write(`Usage: ${APP_NAME} <command> [options]\n\n`);
  process.stdout.write("Commands:\n");
  process.stdout.write("  init [--write] [--source <path>] [--destination <path>]\n");
  process.stdout.write("  doctor [--json]\n");
  process.stdout.write("  config show [--json]\n");
  process.stdout.write("  status [paths...] [--json]\n");
  process.stdout.write("  diff [paths...]\n");
  process.stdout.write("  discover [paths...] [--json]\n");
  process.stdout.write("  inspect <paths...> [--json]\n");
  process.stdout.write("  pull [paths...] [--write] [--json]\n");
  process.stdout.write("  apply [paths...] [--write] [--json]\n");
  process.stdout.write("  track <paths...> [--write] [--interactive] [--template|--encrypt|--exact|--follow]\n");
  process.stdout.write("  ignore add --scope <dir> <patterns...> [--write]\n");
  process.stdout.write("  ignore list <path> [--json]\n");
  process.stdout.write("  source <paths...>\n");
  process.stdout.write("  managed [--json]\n");
  process.stdout.write("  unmanage <paths...> [--write]\n");
  process.stdout.write("  help\n");
  process.stdout.write("\nGlobal flags:\n");
  process.stdout.write("  --config <path>\n");
}

function commandPath(binary: string): string | null {
  return Bun.which(binary) ?? null;
}

async function loadRequiredConfig(args: string[]): Promise<ResolvedConfig> {
  const configPath = consumeStringFlag(args, "--config");
  return await loadConfig(process.cwd(), configPath ?? undefined);
}

async function handleInit(args: string[]): Promise<void> {
  const write = consumeBooleanFlag(args, "--write");
  const force = consumeBooleanFlag(args, "--force");
  const source = consumeStringFlag(args, "--source") ?? ".";
  const destination = consumeStringFlag(args, "--destination") ?? "~";
  assertNoUnexpectedFlags(args);

  const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  const template = renderConfigTemplate({ source, destination, ignoreFileName: DEFAULT_IGNORE_FILE_NAME });

  if (!write) {
    process.stdout.write(`${blue("Init preview")}\nWould write ${configPath}:\n\n${template}`);
    return;
  }

  if ((await pathExists(configPath)) && !force) {
    throw new Error(`${CONFIG_FILE_NAME} already exists. Use --force to overwrite.`);
  }

  await writeTextFile(configPath, template);
  process.stdout.write(`${green(`Wrote ${configPath}`)}\n`);
}

async function handleDoctor(args: string[]): Promise<void> {
  const json = consumeBooleanFlag(args, "--json");
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);

  const details = {
    chezmoiPath: commandPath(config.commands.chezmoi),
    gitPath: commandPath(config.commands.git),
    managedCount: (await getManaged(config)).length,
  };

  if (json) {
    printJson({ config, details });
    return;
  }

  renderDoctor(config, details);
}

async function handleConfigCommand(subcommand: string | undefined, args: string[]): Promise<void> {
  if (subcommand !== "show") {
    throw new Error("Only `loom config show` is supported right now.");
  }

  const json = consumeBooleanFlag(args, "--json");
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);

  if (json) {
    printJson(config);
    return;
  }

  process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
}

async function handleStatus(args: string[]): Promise<void> {
  const json = consumeBooleanFlag(args, "--json");
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);
  const targets = await resolveTargetInputs(args, process.cwd(), config.destinationDir);
  const entries = await enrichStatusEntries(config, await getStatus(config, targets));

  if (json) {
    printJson(entries);
    return;
  }

  renderStatus(entries);
}

async function handleDiff(args: string[]): Promise<void> {
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);
  const diff = await diffPreview(config, args, process.cwd());

  if (diff.trim().length === 0) {
    process.stdout.write(`${green("No diff.")}\n`);
    return;
  }

  process.stdout.write(diff);
}

async function handleDiscover(args: string[]): Promise<void> {
  const json = consumeBooleanFlag(args, "--json");
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);
  const result = await discover(config, args, process.cwd());

  if (json) {
    printJson(result);
    return;
  }

  renderDiscover(result);
}

async function handleInspect(args: string[]): Promise<void> {
  const json = consumeBooleanFlag(args, "--json");
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);

  if (args.length === 0) {
    throw new Error("inspect requires at least one path.");
  }

  const records = await inspectPaths(config, args, process.cwd());
  if (json) {
    printJson(records);
    return;
  }

  renderInspect(records);
}

async function handleSource(args: string[]): Promise<void> {
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);

  if (args.length === 0) {
    throw new Error("source requires at least one path.");
  }

  const targets = await resolveTargetInputs(args, process.cwd(), config.destinationDir);
  for (const target of targets) {
    const sourcePath = await getSourcePath(config, target);
    if (!sourcePath) {
      process.stdout.write(`${target} -> ${red("not managed")}\n`);
      continue;
    }

    process.stdout.write(`${target} -> ${sourcePath}\n`);
  }
}

async function handleManaged(args: string[]): Promise<void> {
  const json = consumeBooleanFlag(args, "--json");
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);
  const managed = await getManaged(config);

  if (json) {
    printJson(managed);
    return;
  }

  for (const item of managed) {
    process.stdout.write(`${item}\n`);
  }
}

async function handlePull(args: string[]): Promise<void> {
  const json = consumeBooleanFlag(args, "--json");
  const write = consumeBooleanFlag(args, "--write");
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);

  const targets = await resolveTargetInputs(args, process.cwd(), config.destinationDir);
  const statusEntries = await enrichStatusEntries(config, await getStatus(config, targets));
  const pullable = statusEntries.filter((entry) => entry.actualDiff !== " " && !entry.templateBacked);
  const templateBlocked = statusEntries.filter((entry) => entry.actualDiff !== " " && entry.templateBacked);

  if (json) {
    printJson({ pullable, templateBlocked, write });
    return;
  }

  renderPullPreview(pullable, templateBlocked);
  if (!write) {
    return;
  }

  if (pullable.length === 0) {
    process.stdout.write(`${yellow("No pullable targets to sync back.")}\n`);
    return;
  }

  await reAdd(config, pullable.map((entry) => entry.path));
  process.stdout.write(`${green(`Synced ${pullable.length} target(s) back into the repo source.`)}\n`);
}

async function handleApply(args: string[]): Promise<void> {
  const json = consumeBooleanFlag(args, "--json");
  const write = consumeBooleanFlag(args, "--write");
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);

  const targets = await resolveTargetInputs(args, process.cwd(), config.destinationDir);
  const statusEntries = await enrichStatusEntries(config, await getStatus(config, targets));
  const applyable = statusEntries.filter((entry) => entry.targetDiff !== " ");

  if (json) {
    printJson({ applyable, write });
    return;
  }

  renderApplyPreview(applyable);
  if (!write) {
    return;
  }

  await applyTargets(config, targets, false);
  process.stdout.write(`${green("Applied repo state to live files.")}\n`);
}

function modeFlags(mode: TrackMode): string[] {
  switch (mode) {
    case "plain":
      return [];
    case "template":
      return ["--template"];
    case "encrypt":
      return ["--encrypt"];
    case "exact":
      return ["--exact"];
    case "follow":
      return ["--follow"];
  }
}

function modeReason(mode: TrackMode): string {
  switch (mode) {
    case "plain":
      return "Track the target using default chezmoi behavior.";
    case "template":
      return "Track the target as a template for machine-specific rendering.";
    case "encrypt":
      return "Track the target as an encrypted file.";
    case "exact":
      return "Track the target without path normalization.";
    case "follow":
      return "Track the target by following symlinks.";
  }
}

async function buildTrackPlans(
  config: ResolvedConfig,
  inputs: string[],
  options: {
    interactive: boolean;
    mode: TrackMode | null;
  },
): Promise<TrackPlan[]> {
  const plans: TrackPlan[] = [];

  for (const input of inputs) {
    const absolutePath = resolveTargetInput(input, process.cwd(), config.destinationDir);
    const exists = await pathExists(absolutePath);
    const selectedMode = options.interactive
      ? await promptTrackMode(absolutePath)
      : (options.mode ?? "plain");

    if (selectedMode === "skip") {
      continue;
    }

    plans.push({
      target: input,
      absolutePath,
      exists,
      mode: selectedMode,
      chezmoiFlags: modeFlags(selectedMode),
      reason: modeReason(selectedMode),
    });
  }

  return plans;
}

async function handleTrack(args: string[]): Promise<void> {
  const write = consumeBooleanFlag(args, "--write");
  const interactive = consumeBooleanFlag(args, "--interactive");
  const template = consumeBooleanFlag(args, "--template");
  const encrypt = consumeBooleanFlag(args, "--encrypt");
  const exact = consumeBooleanFlag(args, "--exact");
  const follow = consumeBooleanFlag(args, "--follow");
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);

  if (args.length === 0) {
    throw new Error("track requires at least one path.");
  }

  const explicitModes = [template, encrypt, exact, follow].filter(Boolean).length;
  if (explicitModes > 1) {
    throw new Error("track accepts only one explicit mode flag at a time.");
  }

  if (interactive && explicitModes > 0) {
    throw new Error("track cannot combine --interactive with an explicit mode flag.");
  }

  let mode: TrackMode | null = null;
  if (template) mode = "template";
  if (encrypt) mode = "encrypt";
  if (exact) mode = "exact";
  if (follow) mode = "follow";

  const plans = await buildTrackPlans(config, args, { interactive, mode });
  renderTrackPlans(plans);

  if (!write || plans.length === 0) {
    return;
  }

  for (const plan of plans) {
    await addTargets(config, [plan.absolutePath], {
      template: plan.mode === "template",
      encrypt: plan.mode === "encrypt",
      exact: plan.mode === "exact",
      follow: plan.mode === "follow",
    });
  }

  process.stdout.write(`${green(`Started managing ${plans.length} target(s).`)}\n`);
}

async function handleIgnore(args: string[]): Promise<void> {
  const subcommand = args.shift();
  if (!subcommand) {
    throw new Error("ignore requires a subcommand.");
  }

  if (subcommand === "list") {
    const json = consumeBooleanFlag(args, "--json");
    const config = await loadRequiredConfig(args);
    assertNoUnexpectedFlags(args);

    if (args.length !== 1) {
      throw new Error("ignore list requires exactly one path.");
    }

    const absoluteTarget = resolveTargetInput(args[0]!, process.cwd(), config.destinationDir);
    const ignoreFiles = await listActiveIgnoreFiles(config, absoluteTarget);
    if (json) {
      printJson(ignoreFiles);
      return;
    }

    renderIgnoreFiles(ignoreFiles);
    return;
  }

  if (subcommand !== "add") {
    throw new Error(`Unknown ignore subcommand: ${subcommand}`);
  }

  const write = consumeBooleanFlag(args, "--write");
  const scope = consumeStringFlag(args, "--scope");
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);

  if (!scope) {
    throw new Error("ignore add requires --scope <dir>.");
  }

  if (args.length === 0) {
    throw new Error("ignore add requires at least one pattern.");
  }

  const patterns = [...new Set(args.map((pattern) => pattern.trim()).filter(Boolean))];
  const scopePath = resolveTargetInput(scope, process.cwd(), config.destinationDir);
  if (!isSubpath(config.destinationDir, scopePath)) {
    throw new Error(`ignore scope must live under ${config.destinationDir}`);
  }

  const ignoreLivePath = path.join(scopePath, config.ignoreFileName);
  let sourcePath = await getSourcePath(config, ignoreLivePath);

  process.stdout.write(`${blue("Ignore plan")}\n`);
  process.stdout.write(`scope: ${scopePath}\n`);
  process.stdout.write(`live file: ${ignoreLivePath}\n`);
  process.stdout.write(`source: ${sourcePath ?? yellow("will be created")}\n`);
  for (const pattern of patterns) {
    process.stdout.write(`- ${pattern}\n`);
  }

  if (!write) {
    return;
  }

  if (!sourcePath) {
    await addTargets(config, [ignoreLivePath], { createNew: true });
    sourcePath = await getSourcePath(config, ignoreLivePath);
  }

  if (!sourcePath) {
    throw new Error(`Unable to resolve source path for ${ignoreLivePath}`);
  }

  await appendUniqueLines(sourcePath, patterns);
  await applyTargets(config, [ignoreLivePath], false);
  process.stdout.write(`${green(`Updated ${sourcePath}`)}\n`);
}

async function handleUnmanage(args: string[]): Promise<void> {
  const write = consumeBooleanFlag(args, "--write");
  const config = await loadRequiredConfig(args);
  assertNoUnexpectedFlags(args);

  if (args.length === 0) {
    throw new Error("unmanage requires at least one path.");
  }

  const targets = await resolveTargetInputs(args, process.cwd(), config.destinationDir);
  process.stdout.write(`${blue("Would stop managing")}\n`);
  for (const target of targets) {
    process.stdout.write(`- ${target}\n`);
  }

  if (!write) {
    return;
  }

  await forgetTargets(config, targets, false);
  process.stdout.write(`${green(`Stopped managing ${targets.length} target(s).`)}\n`);
}

export async function run(argv = Bun.argv.slice(2)): Promise<void> {
  const args = [...argv];
  const command = args.shift();

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "version") {
    process.stdout.write(`${APP_VERSION}\n`);
    return;
  }

  switch (command) {
    case "init":
      await handleInit(args);
      return;
    case "doctor":
      await handleDoctor(args);
      return;
    case "config":
      await handleConfigCommand(args.shift(), args);
      return;
    case "status":
      await handleStatus(args);
      return;
    case "diff":
      await handleDiff(args);
      return;
    case "discover":
      await handleDiscover(args);
      return;
    case "inspect":
      await handleInspect(args);
      return;
    case "pull":
      await handlePull(args);
      return;
    case "apply":
      await handleApply(args);
      return;
    case "track":
      await handleTrack(args);
      return;
    case "ignore":
      await handleIgnore(args);
      return;
    case "source":
      await handleSource(args);
      return;
    case "managed":
      await handleManaged(args);
      return;
    case "unmanage":
      await handleUnmanage(args);
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}
