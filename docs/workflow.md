# Workflow

## Daily loop

1. Edit live files normally.
2. Run `loom status` or `loom discover <path>`.
3. Run `loom diff <path>` if you need the exact patch.
4. Run `loom pull --write <path>` for plain managed files.
5. Commit and push with git.
6. On another machine, pull the repo and run `loom apply --write`.

## Template-backed files

If `inspect` or `pull` says a file is template-backed, edit the source template
instead of assuming `re-add` can sync it.

Use:

```bash
loom source ~/.config/hypr/hyprlock.conf
```

## Tracking new files

Preview first:

```bash
loom track ~/.config/zed/settings.json
```

Then write:

```bash
loom track --write ~/.config/zed/settings.json
```

## Ignore rules

Keep generated noise out of discovery by adding `.loomignore` files either at
the repo root or near the subtree that produces the noise:

```bash
loom ignore add --scope ~/.config/kitty --write 'sessions/**'
```

## Reliability rules

- preview before write
- validate target paths before mutation
- keep templates source-first
- keep ignore metadata in version control when it should travel with the repo
