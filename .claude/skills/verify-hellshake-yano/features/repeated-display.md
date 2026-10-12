# Repeated display

Showing and dismissing hints many times in a session stays as fast as the first time and leaves nothing behind.

## Sub-features

- `no-slowdown` e2e/engine/prefix medians of the last 20% of cycles stay within 1.5x of the first 20%.
- `float-pool` multi-window labels are pooled hidden floats, reused across displays (Neovim's redraw cost grows with every float ever opened, so open/close per hint degraded each display until nvim froze).
- `no-leak` window/buffer counts stop growing after the first display; no shown hint windows or extmarks remain after `<Esc>`.
- `release` `require('hellshake_yano').deactivate()` closes the pool.

## How to get to it (user POV)

- Move around with `w w`, dismiss with `<Esc>`, repeat quickly, especially with `:vsplit` windows open.

## Driving it with verify.py

- Run `.claude/skills/verify-hellshake-yano/verify.py --cycles 100`. Each profile line prints `head/tail` for e2e, engine and prefix; FAIL lines name the degraded metric or the leaking counter and cycle.
- Before/after proof: `git worktree add --detach tmp/old-rt <old-rev>` then `HY_RTP=$PWD/tmp/old-rt .claude/skills/verify-hellshake-yano/verify.py --profile init --cycles 40` must FAIL with a growing tail; remove the worktree afterwards.
- `release`: `tests-lua/test_multiwindow.lua` (pool does not grow, `core.release()` closes it).

## Gotchas

- `nvim_list_wins()` includes the hidden pool (up to `maxHints`, 336). Count shown windows with `nvim_win_get_config(w).hide`.
- In `--full-init`, other plugins open/close their own floats; leaks are judged only as growth.
- Vim9 popups do not show this degradation (measured flat over 60 cycles), so the Vim9 runtime keeps create/close popups.
