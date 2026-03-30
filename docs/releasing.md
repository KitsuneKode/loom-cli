# Releasing

## Release requirements

- npm trusted publisher configured for `KitsuneKode/loom-cli` repository
- package version already bumped in `package.json`
- `bun.lock` committed
- `bun run check` passing locally
- no pending release markdown files left in `.changeset/`

## Trusted publisher setup

Configure the package on npm using the official trusted publishing flow:

- provider: GitHub Actions
- GitHub user or org: `KitsuneKode`
- repository: `loom-cli`
- workflow filename: `release.yml`

Notes:

- npm trusted publishing requires npm CLI `11.5.1+` and Node `22.14.0+`
- GitHub-hosted runners are supported; self-hosted runners are not currently supported
- the workflow in this repo uses Node `24` for the publish step to satisfy npm's requirement

## Day-to-day change flow

For feature or fix work that should land in a release:

```bash
bun run changeset
```

Commit the generated `.changeset/*.md` file with the code change.

## Local preflight

```bash
bun run changeset:status
bun run check
bun run pkg:check
bun run release:dry-run
```

## GitHub release flow

The release workflow lives at `.github/workflows/release.yml`.

It can publish in two ways:

- automatic evaluation on `push` to `main`
- `workflow_dispatch` for a manual run

The workflow does:

1. check whether pending `.changeset/*.md` files still exist
2. refuse to publish while release intent is still pending
3. read package metadata and derive the release tag
4. check whether the current version already exists on npm
5. check whether the matching GitHub release already exists
6. publish to npm with trusted publishing when needed
7. create the GitHub release when the package is published and the release does not yet exist

## Recommended release sequence

1. run `bun run changeset` as part of feature work
2. when ready to ship, run `bun run version-packages`
3. review `package.json`, `bun.lock`, and removed/consumed changesets
4. run local preflight
5. commit and push to `main`
6. verify the workflow summary and package on npm
