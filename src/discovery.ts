import { getDiff, getSourcePath, getStatus, getUnmanaged } from "./engine/chezmoi.ts";
import { isDirectory, pathExists, resolveTargetInputs, resolveTargetInput } from "./fs.ts";
import { getIgnoreMatches } from "./ignore.ts";
import type { DiscoverResult, InspectRecord, LoomStatusEntry, ResolvedConfig } from "./types.ts";

export async function enrichStatusEntries(
  config: ResolvedConfig,
  entries: LoomStatusEntry[],
): Promise<LoomStatusEntry[]> {
  return await Promise.all(entries.map(async (entry) => {
    const sourcePath = await getSourcePath(config, entry.path);
    return {
      ...entry,
      sourcePath,
      templateBacked: sourcePath?.endsWith(".tmpl") ?? false,
    };
  }));
}

function uniqueStatusEntries(entries: LoomStatusEntry[]): LoomStatusEntry[] {
  const seen = new Set<string>();
  const result: LoomStatusEntry[] = [];

  for (const entry of entries) {
    if (seen.has(entry.path)) {
      continue;
    }

    seen.add(entry.path);
    result.push(entry);
  }

  return result;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export async function discover(config: ResolvedConfig, inputs: string[], cwd: string): Promise<DiscoverResult> {
  const targets = inputs.length > 0
    ? await resolveTargetInputs(inputs, cwd, config.destinationDir)
    : [config.destinationDir];

  const statusEntries = uniqueStatusEntries(await enrichStatusEntries(config, await getStatus(config, targets)));
  const managedDrift = statusEntries.filter((entry) => entry.actualDiff !== " " && !entry.templateBacked);
  const templateBlocked = statusEntries.filter((entry) => entry.actualDiff !== " " && entry.templateBacked);
  const applyDrift = statusEntries.filter((entry) => entry.targetDiff !== " ");

  const ignoredMatches = new Map<string, Awaited<ReturnType<typeof getIgnoreMatches>>[number]>();
  const unmanaged: string[] = [];

  for (const candidate of uniqueStrings(await getUnmanaged(config, targets))) {
    const matches = await getIgnoreMatches(config, candidate);
    if (matches.length === 0) {
      unmanaged.push(candidate);
      continue;
    }

    for (const match of matches) {
      ignoredMatches.set(`${match.path}|${match.ignoreFile}|${match.pattern}`, match);
    }
  }

  return {
    managedDrift,
    templateBlocked,
    applyDrift,
    unmanaged,
    ignored: [...ignoredMatches.values()],
  };
}

export async function inspectPaths(config: ResolvedConfig, inputs: string[], cwd: string): Promise<InspectRecord[]> {
  const absoluteTargets = inputs.map((input) => resolveTargetInput(input, cwd, config.destinationDir));
  const statusMap = new Map(
    (await enrichStatusEntries(config, await getStatus(config, absoluteTargets))).map((entry) => [entry.path, entry] as const),
  );

  return await Promise.all(inputs.map(async (input, index) => {
    const absolutePath = absoluteTargets[index]!;
    const exists = await pathExists(absolutePath);
    const directory = exists ? await isDirectory(absolutePath) : false;
    const sourcePath = await getSourcePath(config, absolutePath);
    const templateBacked = sourcePath?.endsWith(".tmpl") ?? false;
    const ignored = sourcePath ? [] : await getIgnoreMatches(config, absolutePath);
    const status = statusMap.get(absolutePath) ?? null;

    let recommendedAction: InspectRecord["recommendedAction"] = "leave-alone";
    if (sourcePath && templateBacked && status?.actualDiff !== " ") {
      recommendedAction = "edit-source";
    } else if (sourcePath && status?.actualDiff !== " ") {
      recommendedAction = "pull";
    } else if (sourcePath && status?.targetDiff !== " ") {
      recommendedAction = "apply";
    } else if (!sourcePath && ignored.length === 0 && exists) {
      recommendedAction = "track";
    } else if (!sourcePath && ignored.length > 0) {
      recommendedAction = "ignore";
    }

    return {
      input,
      absolutePath,
      exists,
      directory,
      managed: sourcePath !== null,
      sourcePath,
      templateBacked,
      ignored,
      status,
      recommendedAction,
    };
  }));
}

export async function diffPreview(config: ResolvedConfig, inputs: string[], cwd: string): Promise<string> {
  const targets = inputs.length > 0
    ? await resolveTargetInputs(inputs, cwd, config.destinationDir)
    : [];

  return await getDiff(config, targets);
}
