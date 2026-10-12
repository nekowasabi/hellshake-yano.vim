# Multi-window labels and prefix input

With `multiWindowMode`, labels cover every visible window (same buffer in a vsplit gets separate labels); typing a label prefix narrows and highlights, the full label jumps.

## Sub-features

- `per-window-labels` the same buffer in two windows gets distinct labels (window-relative floats).
- `prefix-rerender` typing `B` re-renders all labels with the current-prefix highlight.
- `jump` a full label moves to that window and position.
- `cancel` `<Esc>` or a `cancelKeys` entry hides without moving.

## How to get to it (user POV)

- `:vsplit`, `:split`, then `w w` and type a label such as `BB`.

## Driving it with verify.py

- The `init` profile builds vsplit + split and sends `B` each cycle; `prefix p95` and its head/tail are the proof that re-render stays fast.
- `jump` and `cancel` are asserted in `tests-lua/test_multiwindow.lua` and `tests-ui/test_native.py` (run with `scripts/test-lua.sh` and `python3 tests-ui/test_native.py`).

## Gotchas

- Lowercase keys cancel in single-window mode but not in multi-window mode; `B` works in both profiles.
- Floats are placed relative to their target window; a pooled float stranded in another tabpage is replaced on the next render.
