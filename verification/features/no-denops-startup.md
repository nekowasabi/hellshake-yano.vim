# Startup without denops

## Sub-features

- Neovim 0.10+: `plugin/hellshake-yano-native.vim` runs the Lua runtime (`require('hellshake_yano').activate()`).
- Vim 9 +popupwin: the same file runs `hellshake_yano#native#runtime#Activate()`.
- Counted motion keys are mapped (`w` with `perKeyMotionCount.w = 2`).

## How to get to it (user POV)

Install the plugin with no denops.vim, set `g:hellshake_yano_native = 1` and `g:hellshake_yano` before plugins load, start the editor.
Nothing errors at startup and `w` pressed twice shows hints.

## Driving it with verify.sh

Both scripts start the editor with `-u NONE`, the repo prepended to `runtimepath`, then `runtime! plugin/*.vim` and
`source verification/startup-check.vim`. The check fails (non-zero exit) when any of:

- `autoload/denops.vim` is on `runtimepath` (the check would prove nothing),
- `g:loaded_hellshake_yano_native` is unset (prints `g:hellshake_yano_native_error`),
- `maparg('w', 'n', 0, 1)` is not the hellshake-yano mapping,
- `:scriptnames` lists any path containing `denops`,
- `v:errmsg` is non-empty.

Proof: `<evidence>/{nvim,vim}/startup.txt` — editor version, the `w` mapping dict, full `:scriptnames`, the error list.

## Gotchas

- Without `g:hellshake_yano_native = 1` Vim falls back to `plugin/hellshake-yano-vim.vim` and the check fails with
  `native not loaded` — intended. If Denops removal makes native the default, the flag stays harmless.
- Default config has no counted motions, so `w` is unmapped; the scripts set `perKeyMotionCount` to get a mapping.
- `-u NONE` skips `plugin/` loading, hence the explicit `runtime!`.
