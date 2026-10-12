# Hint display

Pressing a configured motion key enough times in a row shows jump labels over visible words.

## Sub-features

- `count-trigger` hints appear on the Nth consecutive press (`perKeyMotionCount`, default `defaultMotionCount` 3).
- `wrapped-user-motion` keys the user already mapped as plain noremap motions (`nnoremap j gj`) still trigger hints and keep their rhs.
- `key-repeat-suppression` held-down keys (< `keyRepeatThreshold` 50ms apart) do not trigger.
- `latency` labels appear "instantly" (p95 e2e < 100ms on the init profile).

## How to get to it (user POV)

- With `let g:hellshake_yano_native = v:true` before plugins load, press `w` `w` (user config: count 2) in a normal buffer.
- `:HellshakeYanoShow` shows hints without a motion.

## Driving it with verify.py

- Run `.claude/skills/verify-hellshake-yano/verify.py --profile init`. The line `[init] PASS ... e2e p95=<ms>` is the latency proof; `init-screen-first.txt` shows labels (`/`, `BB`, …) drawn over the fixture.
- For the user's exact environment run with `--full-init`.
- `wrapped-user-motion`: `tests-lua/test_mapping.lua` (unit) and `--full-init` (the user's `j`/`k` → `gj`/`gk<Esc>`).

## Gotchas

- Config must be `g:hellshake_yano` (a misspelt variable silently yields defaults: only `h`/`l` mapped).
- Sending `ww` in one `nvim_input` is key-repeat and shows nothing; keep the 80ms gap.
- `directionalHintFilter` with the cursor at buffer start leaves backward motions (`b`, `k`, `h`) without targets; the harness starts at line 150.
