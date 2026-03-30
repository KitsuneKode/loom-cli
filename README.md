# loom

`loom` is a preview-first dotfiles workflow CLI built on top of `chezmoi`.
It keeps one repo as the source of truth, lets you keep editing live files, and
helps you discover, inspect, track, ignore, sync back, and apply changes with
explicit control.

[![CI](https://github.com/KitsuneKode/loom-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/KitsuneKode/loom-cli/actions/workflows/ci.yml)
[![npm package](https://img.shields.io/npm/v/%40kitsunekode%2Floom)](https://www.npmjs.com/package/@kitsunekode/loom)

The npm package name is `@kitsunekode/loom`. The installed executable stays `loom`.

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

## Versioning with Changesets

`loom` uses [Changesets](https://github.com/changesets/changesets) for
release intent and version bumps.

Normal flow:

```bash
bun run changeset
git add .changeset
git commit -m "feat: ..."
```

When you're ready to cut a release version:

```bash
bun run version-packages
git add package.json bun.lock .changeset
git commit -m "chore: version packages"
```

## Publish to npm

The repo is ready for npm-style packaging:

- `package.json` exposes `bin/loom`
- `files` keeps the published package minimal
- `prepack` builds `dist/loom.js`

Before publishing:

```bash
bun run changeset:status
bun run check
npm pack --dry-run --ignore-scripts
bun run release:dry-run
```

The automated publish flow lives in `/.github/workflows/release.yml`.
It is configured for npm trusted publishing with GitHub OIDC, not `NPM_TOKEN`.

Before the first real publish, configure a trusted publisher on npm for:

- GitHub user or org: `KitsuneKode`
- Repository: `loom-cli`
- Workflow filename: `release.yml`

See `docs/releasing.md` for the full release checklist.

Important:

- pending changesets block the automated publish workflow
- trusted publishing requires a GitHub-hosted runner and a matching npm trusted
  publisher configuration
- once versions are cut and no changesets are pending, the `main` branch release
  workflow can publish the new npm version

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
