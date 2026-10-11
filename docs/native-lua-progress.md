# Neovim Lua core: S2 work in progress

Base: `7ff640a` on `feat/remove-denops`.

The native modules are opt-in while S2 is under construction. The existing plugin
entry points and denops implementation are unchanged; loading the repository does
not activate the new core. S3 must not delete denops until the remaining parity
items are verified.

## Implemented foundation

- Hint labels: configured single/multi-character keys, numeric overflow, capacity.
- Hint assignment: distance order, current-window cursor exclusion, UTF-8 byte
  positions, start/end/both positions.
- Native extmark display, prefix highlighting, hide/enable/disable/toggle.
- Window-relative floating hints for multi-window mode, including distinct views
  of the same buffer; selection closes all owned hint windows and buffers.
- Input selection and stale-buffer/window validation before jumping.
- Native motion counters by buffer/key, explicit-count bypass, repeat suppression.
- Visible-window word detection, fold exclusion, floating-window exclusion,
  directional filtering, per-key minimum lengths.
- Configuration aliases and defaults carried forward from the TypeScript core.

`require('hellshake_yano.core').show(words)` accepts `{text, line, col, bufnr?,
winid?}` entries. `line` and `col` are **1-based UTF-8 byte coordinates**. The Lua
boundary intentionally does not overload `col` with screen columns. Existing TS
callers using display columns must explicitly pass their `byteCol` instead.

## Not yet complete

Input polling/mapping integration, TinySegmenter, dictionaries, full continuous/visual-mode
behavior, full configuration validation, and dispatcher compatibility remain.
The complete S2 stage is not yet finished.

## Verification

Run `NVIM_BIN=/path/to/nvim scripts/test-lua.sh` with Neovim 0.10 or later.
Tests use `-u NONE` and no downloaded test plugins. Also run
`scripts/test-nvim.sh` and `python3 scripts/test-vim-gate.py`.

Initial VM validation with official Neovim 0.10.4:

- Lua core: 10 cases pass; word/window and motion suites pass.
- Existing Neovim gate: PASS 21 / KNOWN 20 / FAIL 0 / SKIP 13.
- Gate unit tests: 6 pass.
- Full Vim is unavailable in this VM; `vim.tiny` cannot validate popup/Vim9 parity.

The old input paths disagree: single-window input returns lowercase letters to
normal editing, whereas multi-window input does exact matching and gives
configured cancel keys precedence. PLAN-memo.md's blanket statement that input
is case-insensitive is not a reliable specification. Preserve each path until a
behavior change is intentionally reviewed.
