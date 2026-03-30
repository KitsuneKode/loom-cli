# Config Reference

`loom` reads `.loom.toml` from the current working directory or an ancestor.

## Example

```toml
version = 1
engine = "chezmoi"
source = "."
destination = "~"
ignore_file_name = ".loomignore"

[commands]
chezmoi = "chezmoi"
git = "git"

[safety]
preview_first = true
```

## Fields

### `version`

Config schema version. Current value: `1`.

### `engine`

Current supported engine: `"chezmoi"`.

### `source`

Path to the `chezmoi` source root, relative to the repo root unless absolute.
For repos that use `.chezmoiroot`, `source = "."` is usually correct because
`chezmoi` resolves the actual source tree from the repo root.

### `destination`

Path to the live destination root, usually `"~"`.

### `ignore_file_name`

Filename for ignore metadata. Default: `.loomignore`.

### `[commands].chezmoi`

Executable used for the `chezmoi` engine.

### `[commands].git`

Executable used for git review commands.

### `[safety].preview_first`

Advisory flag that documents the repo's preferred safety posture. Current CLI
behavior still requires `--write` for mutation.
