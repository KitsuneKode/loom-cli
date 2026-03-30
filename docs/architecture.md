# Architecture

## Runtime shape

`loom` is a Bun-native TypeScript CLI with a small explicit module graph:

- `src/cli.ts`: top-level routing and UX contract
- `src/config.ts`: `.loom.toml` lookup, parsing, and path resolution
- `src/engine/chezmoi.ts`: all `chezmoi` subprocess execution and output parsing
- `src/discovery.ts`: drift, unmanaged candidate, and template-backed detection
- `src/ignore.ts`: repo-root and distributed `.loomignore` semantics
- `src/prompt.ts`: optional lightweight interactive flows
- `src/output.ts`: deterministic human and JSON rendering

The runtime deliberately keeps dependencies minimal. `chezmoi` remains the
state engine. `loom` is a higher-level interaction layer, not a replacement
state store.

## State model

There are only four meaningful state layers:

- Git repo state
- `chezmoi` source state
- live destination files under `$HOME`
- `.loom.toml` and `.loomignore` metadata

`loom` does not maintain a second tracking index or background database.

## Safety model

Mutating commands are preview-first by default.

- `pull`, `apply`, `track`, `ignore add`, and `unmanage` explain what would
  happen unless `--write` is present
- template-backed live files are surfaced explicitly so users do not assume a
  sync-back succeeded when `chezmoi re-add` cannot update the template source
- local file writes use atomic replace semantics where `loom` edits metadata
  files itself

## Ignore model

`.loomignore` supports both of these shapes:

- repo-root ignore metadata
- distributed subtree ignore metadata near noisy live directories

Distributed files are the recommended default because the ignore intent lives
close to the files that generate the noise. In a dotfiles repo, those ignore
files can themselves be managed and distributed with `chezmoi`.

## Why Bun

Bun fits this workspace well:

- fast startup for CLI use
- built-in TS execution and bundling
- built-in TOML parsing and glob matching
- good DX without a larger Node toolchain

The implementation avoids heavy frameworks and shells out only to `chezmoi` and
`git`, which are already part of the workflow.
