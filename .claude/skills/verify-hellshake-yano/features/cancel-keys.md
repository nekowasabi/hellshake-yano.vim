# cancelKeys close hints and keep the key's job

A key listed in `cancelKeys` hides the hints and then runs as an ordinary Vim command (`y` starts a yank, `<C-d>` scrolls, `3` starts a count), as if the hints were never shown.

## Sub-features

- `plain-keys` single characters (`y`, `x`, `f`, digits) cancel and are replayed.
- `cr` `<CR>` is matched specially (getchar gives `\r`).
- `notation-keys` other `<...>` keys such as `<C-d>`.
- `esc` `<Esc>` / `<C-c>` hide without replaying (not a cancelKey; always on).

## How to get to it (user POV)

- With the init.vim settings (`multiWindowMode` on), press `w w` so hints appear, then press a cancelKey. Hints vanish and the key does what it does without hints.

## Driving it with cancel_keys.py

- `uv run --no-project --with msgpack .claude/skills/verify-hellshake-yano/cancel_keys.py` drives every configured key; one line per key.
- Proof is the control/test comparison in `cancel-keys.json`: same mode, cursor, topline and buffer text, hints not visible.

## Gotchas

- 2026-11-05: `<C-d>` failed (control cursor `[162,18]` top 151, test `[151,12]` top 140: no scroll) because the cancelKeys entry was compared as the literal text `<C-D>`, not the key code; with `multiWindowMode` an unmatched key is not replayed, so it was lost. Fixed by translating entries with `nvim_replace_termcodes` (Lua) / `"\<...>"` (Vim9); all 22 keys pass. A FAIL on any `<...>` key means that translation regressed.
- In single-window mode lowercase keys cancel before cancelKeys are consulted, so run the default (vsplit) layout to test the user's setup.
- `<Esc><Esc>` between runs leaves `f`/`t`/count pending states; the harness reloads the fixture each run, so `x`/`p` edits do not carry over.
