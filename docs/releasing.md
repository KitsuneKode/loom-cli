# Releasing

## Release requirements

- `NPM_TOKEN` GitHub Actions secret with publish access
- package version already bumped in `package.json`
- `bun.lock` committed
- `bun run check` passing locally

## Local preflight

```bash
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

1. read package metadata and derive the release tag
2. check whether the current version already exists on npm
3. check whether the matching GitHub release already exists
4. publish to npm when needed and `NPM_TOKEN` is configured
5. create the GitHub release when the package is published and the release does not yet exist

## Recommended release sequence

1. bump `package.json` version
2. run local preflight
3. commit and push
4. push to `main`
5. verify the workflow summary and package on npm
