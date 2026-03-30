# loom-cli

`loom` is a preview-first dotfiles workflow CLI built on top of `chezmoi`.
It keeps one repo as the source of truth, lets you keep editing live files, and
helps you discover, inspect, track, ignore, sync back, and apply changes with
explicit control.

## Why it exists

`chezmoi` is excellent at rendering one source repo onto scattered files in
`$HOME`, but its raw commands are still a bit low-level for day-to-day
"what changed and what should I do with it?" flows.

`loom` adds that missing layer:

- preview-first workflows instead of surprise mutation
- human-readable discovery of managed, unmanaged, ignored, and template-backed files
- stable `--json` output for agents and automation
- `.loomignore` files that can live at the repo root or near noisy subtrees
- no extra tracking database beyond your Git repo and `chezmoi`

## Design goals

- keep `chezmoi` as the engine
- keep `git` as the review and history layer
- default every mutation to preview-first
- avoid partial local file corruption by validating before mutation and using
  atomic local file writes where `loom` edits files itself
- keep startup fast and dependencies minimal

## Install locally

```bash
bun install
bun run build
./bin/loom doctor
```

Optional global link:

```bash
bun run link:global
```

## Publish to npm

The repo is ready for npm-style packaging:

- `package.json` exposes `bin/loom`
- `files` keeps the published package minimal
- `prepack` builds `dist/loom.js`

Before publishing:

```bash
bun run check
npm pack --dry-run --ignore-scripts
npm publish
```

## Quick start

Initialize a repo-local config in a dotfiles repo:

```bash
loom init --write
```

Inspect what changed:

```bash
loom status
loom diff ~/.config/zsh ~/.config/hypr
loom discover ~/.config/hypr
```

Sync live edits back into the repo:

```bash
loom pull ~/.config/zsh ~/.config/hypr
loom pull --write ~/.config/zsh ~/.config/hypr
```

Track a new config file:

```bash
loom track ~/.config/zed/settings.json
loom track --write ~/.config/zed/settings.json
```

Add a subtree-local ignore file:

```bash
loom ignore add --scope ~/.config/hypr 'shaders/.compiled.cache.glsl'
loom ignore add --scope ~/.config/hypr --write 'shaders/.compiled.cache.glsl'
```

## Core model

- `git`: review, commit, push, branch, revert
- `chezmoi`: source/destination mapping, add, re-add, apply, templates, encryption
- `loom`: discovery, inspection, ignore ergonomics, preview-first mutation

## Commands

- `loom init [--write]`
- `loom doctor [--json]`
- `loom config show [--json]`
- `loom status [paths...] [--json]`
- `loom diff [paths...]`
- `loom discover [paths...] [--json]`
- `loom inspect <paths...> [--json]`
- `loom pull [paths...] [--write] [--json]`
- `loom apply [paths...] [--write] [--json]`
- `loom track <paths...> [--template|--encrypt|--exact|--follow|--interactive] [--write]`
- `loom ignore add --scope <dir> <patterns...> [--write]`
- `loom ignore list <path> [--json]`
- `loom source <paths...>`
- `loom managed [--json]`
- `loom unmanage <paths...> [--write]`

See `docs/architecture.md`, `docs/config-reference.md`, and `docs/workflow.md`
for the full model.
