export interface LoomConfigFile {
  version?: number;
  engine?: string;
  source?: string;
  destination?: string;
  ignore_file_name?: string;
  commands?: {
    chezmoi?: string;
    git?: string;
  };
  safety?: {
    preview_first?: boolean;
  };
}

export interface ResolvedConfig {
  version: number;
  engine: string;
  repoRoot: string;
  configPath: string;
  source: string;
  sourceDir: string;
  destination: string;
  destinationDir: string;
  ignoreFileName: string;
  commands: {
    chezmoi: string;
    git: string;
  };
  safety: {
    previewFirst: boolean;
  };
}

export interface LoomStatusEntry {
  actualDiff: string;
  targetDiff: string;
  path: string;
  sourcePath?: string | null;
  templateBacked?: boolean;
}

export interface IgnoreRule {
  ignoreFile: string;
  scopeDir: string;
  pattern: string;
}

export interface IgnoreMatch extends IgnoreRule {
  path: string;
}

export interface ActiveIgnoreFile {
  path: string;
  scopeDir: string;
  patterns: string[];
}

export interface DiscoverResult {
  managedDrift: LoomStatusEntry[];
  templateBlocked: LoomStatusEntry[];
  applyDrift: LoomStatusEntry[];
  unmanaged: string[];
  ignored: IgnoreMatch[];
}

export type RecommendedAction = "pull" | "edit-source" | "track" | "ignore" | "apply" | "leave-alone";

export interface InspectRecord {
  input: string;
  absolutePath: string;
  exists: boolean;
  directory: boolean;
  managed: boolean;
  sourcePath: string | null;
  templateBacked: boolean;
  ignored: IgnoreMatch[];
  status: LoomStatusEntry | null;
  recommendedAction: RecommendedAction;
}

export type TrackMode = "plain" | "template" | "encrypt" | "exact" | "follow";

export interface TrackPlan {
  target: string;
  absolutePath: string;
  exists: boolean;
  mode: TrackMode;
  chezmoiFlags: string[];
  reason: string;
}
