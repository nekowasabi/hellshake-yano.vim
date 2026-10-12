---
name: verify-hellshake-yano
description: Verify hellshake-yano's native Neovim runtime (g:hellshake_yano_native) by driving a real nvim over msgpack RPC — hint display latency from motion keys, and that repeated displays (vsplit / multi-window, prefix input) do not get slower or leak windows. Use after touching lua/hellshake_yano/*, before claiming a speed or "hints show / don't freeze" fix, or when a user reports hints slowing down.
---

# verify-hellshake-yano

Surface: Neovim with the native Lua runtime. A user presses a counted motion
(`w` twice with the user's `perKeyMotionCount`), hint labels appear, a prefix
key (`B`) re-renders them, `<Esc>` hides them. The Vim9 runtime
(`autoload/hellshake_yano/native/`) is not driven here; it has its own suite
(`scripts/test-vim9.sh`).

Everything goes through one helper, `verify.py` (next to this file). It needs
`nvim` >= 0.10 and Python `msgpack`.

## Launch

No server. Each profile spawns its own `nvim --embed` with a 120x40 UI attached,
the checkout prepended to `runtimepath`, and a 400-line mixed English/Japanese
fixture. Instances are private to the run, so parallel runs are safe and the
user's running Neovim is never touched.

```sh
.claude/skills/verify-hellshake-yano/verify.py                 # init + single, 100 cycles
.claude/skills/verify-hellshake-yano/verify.py --full-init     # init profile loads the WHOLE init.vim + plugins
HY_RTP=~/.config/nvim/plugged/hellshake-yano.vim .claude/skills/verify-hellshake-yano/verify.py --profile init
```

Profiles:

- `init` — the user's real settings: the `let g:hellshake_yano = {...}` block
  copied verbatim from `~/.config/nvim/init.vim` (override with `HY_INIT`),
  run under `-u NONE`. Layout: `vsplit` (same buffer twice) + `split` on a
  second buffer — the case that used to slow down. `multiWindowMode` is on, so
  this is the float rendering path.
- `--full-init` — same profile but nvim starts with the full init.vim and every
  plugin, and native is started by `plugin/hellshake-yano-native.vim` itself.
  Closest to what the user runs.
- `single` — defaults (single-window extmark path), `perKeyMotionCount.w = 2`.

Ready = the doctor below passes; the script does this itself.

## Doctor

Run automatically per profile; exit code `2` means "not worth driving":

- Neovim reports `has('nvim-0.10')`.
- `require('hellshake_yano').activate` was loaded from the checkout under test
  (`HY_RTP` or this repo), not a stale plugged copy.
- `maparg('w','n')` is the `hellshake-yano native motion` mapping.
- `--full-init` only: `g:loaded_hellshake_yano_native` is set; otherwise
  `g:hellshake_yano_native_error` is printed.

## Drive

Per cycle (real user path, no internal setters for the measured part):

1. Cursor to line 150 and `motion.reset()` (setup, not measured).
2. `nvim_input('w')`, wait until the cursor actually moved, then `--key-gap`
   (80ms, above `keyRepeatThreshold` 50ms so it is not key-repeat), `nvim_input('w')`.
3. Poll `core.get_state().visible` → **e2e_ms** (key → labels shown, includes redraw).
4. `nvim_input('B')`, poll `state.prefix == 'B'` → **prefix_ms** (full re-render).
5. `nvim_input('<Esc>')`, poll until hidden; snapshot windows, buffers, shown
   windows, extmarks, Lua heap.

`words.detect` and `core.show` are wrapped by the harness (not the repo) to log
**engine_ms** = detect + show for the same keypress.

Polls sleep 2ms between RPC requests: back-to-back requests starve typeahead
inside the runtime's `vim.wait()` loop, so `<Esc>` would only land at
`motionTimeout`. A hide that takes ~2000ms means the harness polled too hard,
not that the plugin is slow.

## Evidence and verdict

Written to `tmp/verify-evidence/<YYYYmmdd-HHMMSS>/` (gitignored, survives cleanup):

- `metrics.json` — every cycle's timings and snapshots, per profile.
- `<profile>-screen-first.txt` / `-last.txt` — the attached UI grid with labels
  drawn, plus the current window's label list.
- `<profile>-nvim.log` — `NVIM_LOG_FILE`.

Stdout: one line per profile, `PASS`/`FAIL` plus p95 and head/tail medians.
Exit `0` pass, `1` fail, `2` doctor fail. FAIL when any of:

- p95 over budget: e2e and prefix `--e2e-budget` 100ms, engine `--engine-budget` 50ms.
- Degradation: median of the last 20% of cycles > 1.5x (`--max-ratio`) the
  first 20% and more than 3ms (`--noise-ms`) apart — for e2e, engine, prefix.
- Leak: windows/buffers grow past the warm-up peak (the hidden float pool
  legitimately appears after the first display), or shown hint floats
  (`winhighlight` containing `HellshakeYano`) / extmarks exceed the pre-run
  baseline after `<Esc>`. Other plugins' floats are not counted.
- Lua heap grew > 2MB (`--max-lua-kb`), labels missing from the UI grid, a
  new `v:errmsg` during the cycles, or `stuck` (a cycle whose hints never
  showed/hid within 3s; the grid is saved as `<profile>-screen-stuck.txt`).
- Before cycles the harness plays `w w B <Esc>` once with hints disabled: the
  user's plugins raise `E31: No such mapping` (and `E802` on `enew`) with
  hints off, so those land in `startup_errmsg` and are not judged.

Budgets were calibrated on the author's WSL2 machine (`--full-init` e2e p95
~60ms, engine ~32ms); treat a budget-only FAIL on slower hardware as a flag,
and the head/tail ratio as the real degradation signal.

Proof that the check bites: against the pre-pool code (`git worktree add`
of `62bd1d2`, `HY_RTP=` that path) `init` fails with e2e 64.8ms → 269ms.

## Cleanup

The script terminates (then kills) only the nvim processes it spawned, in a
`finally`. Nothing else to tear down. Evidence stays. If you created a
worktree for a before/after comparison, remove it with
`git worktree remove --force <path>`.

## Features

See `features/README.md` for what to drive and what proves it.
