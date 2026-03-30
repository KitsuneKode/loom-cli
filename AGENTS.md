# AGENTS

`loom-cli` is a Bun-native wrapper around `chezmoi` for preview-first dotfiles
discovery, sync-back, ignore management, and safe apply flows.

## Read order

1. `README.md`
2. `docs/architecture.md`
3. `docs/config-reference.md`
4. `docs/workflow.md`
5. `docs/releasing.md` when changing packaging or release behavior

## Key files

- `src/cli.ts`: command routing and UX contract
- `src/config.ts`: `.loom.toml` lookup and resolution
- `src/engine/chezmoi.ts`: all `chezmoi` integration and parsing
- `src/discovery.ts`: managed/unmanaged/ignored inspection
- `src/ignore.ts`: hybrid `.loomignore` semantics

## Commands

- `bun test`
- `bun run typecheck`
- `bun run build`
- `bun run check`
- `bun run pkg:check`
- `bun run link:global`

## Repo contract

- `chezmoi` stays the source-of-truth engine; `loom` must not create a second
  tracking database.
- `.loom.toml` is repo-local configuration.
- `.loomignore` supports both repo-root and distributed subtree metadata.
- Mutating commands stay preview-first unless `--write` is passed.
- Agent-facing commands expose `--json` where the result is useful for tooling.

## When changing behavior

Update the CLI help text, README examples, architecture docs, and affected tests
in the same change.
