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

Advanced dictionary compatibility, cross-window visual-mode behavior, full configuration validation, and dispatcher compatibility remain.
The complete S2 stage is not yet finished.

## Verification

Run `NVIM_BIN=/path/to/nvim scripts/test-lua.sh` with Neovim 0.10 or later.
Tests use `-u NONE` and no downloaded test plugins. Also run
`scripts/test-nvim.sh` and `python3 scripts/test-vim-gate.py`.

Initial VM validation with official Neovim 0.10.4:

- Lua core: 12 cases pass; word/window and motion suites pass.
- Existing Neovim gate: PASS 21 / KNOWN 20 / FAIL 0 / SKIP 13.
- Gate unit tests: 6 pass.
- Full Vim is unavailable in this VM; `vim.tiny` cannot validate popup/Vim9 parity.

The old input paths disagree: single-window input returns lowercase letters to
normal editing, whereas multi-window input does exact matching and gives
configured cancel keys precedence. PLAN-memo.md's blanket statement that input
is case-insensitive is not a reliable specification. Preserve each path until a
behavior change is intentionally reviewed.

## TinySegmenter port

The Lua segmenter embeds the same model as the former dependency
`@birchill/tiny-segmenter@1.0.0`, retaining Taku Kudo's copyright and complete
BSD license in `licenses/TinySegmenter.txt`. There is no runtime network access,
Deno, Node, or npm dependency.

Source: https://github.com/birchill/tiny-segmenter (npm version 1.0.0).
Package integrity verified before extracting coefficients:
`sha512-jcWdeRt8N/PLfqNbXFNXB0YrFr8+KV2EXkM0z5FZvhb0vH8G2Nnz8BME1oF8fdMhtdyX+jFKfoJVzPv1rOwo7g==`.
Original license: http://chasen.org/~taku/software/TinySegmenter/LICENCE.txt .

The checked-in 27 golden cases were produced with the pinned upstream package.
An additional 1,000 seeded randomized BMP-input comparisons passed against that
package in the VM. The Lua port iterates complete UTF-8 codepoints so non-BMP
characters are preserved rather than split into JavaScript surrogate halves.
Word extraction supports regex/tinysegmenter/hybrid selection, Japanese minimum
length, and the existing particle-merging list. Dictionary rules are separate
and remain to be completed.

## Native runtime integration

`require('hellshake_yano').setup(options)` configures the opt-in runtime;
`activate()` installs commands and motion mappings only where no mapping/command
already exists. `deactivate()` removes only owned definitions. The existing
plugin entry files still do not call these functions automatically.

Motion mappings use a `<Cmd>` suffix after the original motion, rather than a
scheduled callback, so queued hint keys cannot run as normal editing commands.
The input loop is bounded by `motionTimeout`; disable/reinitialization invalidates
an older loop. Continuous mode is iterative and stops at its jump limit.

Additional UI check (Python `msgpack` is required):
`NVIM_BIN=/path/to/nvim python3 tests-ui/test_native.py`.
This attaches an actual Neovim grid UI and checks visible Japanese hint positions,
horizontal scrolling, two views of one buffer, and cleanup. Headless word tests
alone do not validate rendered viewport coordinates.

## Dictionary scope and review limits

JSON, text, and a data-only YAML subset are loaded without Deno. Supported YAML:
indented mappings/sequences, flow collections, quoted/plain scalars, and comments.
Aliases, tags, block scalars and duplicate keys are rejected explicitly. Files
larger than 1 MiB are rejected. Failed setup/reload retains the previous dictionary.

`customWords` and `preserveWords` provide literal whole-word targets; `hintPatterns`
support start/end/capture positions and a checked common ECMAScript regex subset.
Lookarounds, lazy quantifiers, multiline regexes and unsupported escapes are
rejected rather than silently translated. Native assignment preserves the old TypeScript distance-first ordering,
even when dictionary priority metadata is present. Changing that ordering would
be a separate behavior change. `mergeRules` and `compoundPatterns` are retained as data but their
runtime semantics, dictionary writing, and full YAML/ECMAScript compatibility
remain S4 gaps. Do not remove denops while those requirements are unresolved.

Config validation covers booleans, integer ranges, per-key values, hint keys,
colors, enums and collection types; snake_case aliases are accepted. Invalid
configuration is rejected before an active native runtime is deactivated.

A differential check against the checked-out TypeScript hint generator passed
500 seeded configurations. It caught and fixed the marker-fallback case where
`maxSingleCharHints` and numeric overflow must not apply.

## Latest checkpoint: 2026-10-11

- All 10 native Lua test files pass, including the synthetic user profile in
  `tests-lua/test_user_profile.lua` (Japanese, dictionary priority, two windows,
  configured colors, per-key mappings, and toggle).
- Actual-grid UI integration passes; repeated multi-window display/prefix/hide
  cycles release their scratch buffers and windows.
- The normal and Visual motion mappings preserve queued input and the Visual
  anchor. Continuous mode stops at its configured bound.
- Existing Neovim gate is still PASS 21 / KNOWN 20 / FAIL 0 / SKIP 13. Known
  failures have not been erased or expanded. Gate unit tests remain 6/6.
- `bash -n scripts/test-lua.sh`, Python compilation, and `git diff --check` pass.

`HY_EVIDENCE_DIR=/path/to/output scripts/test-lua.sh` records runtimepath and
scriptnames for the synthetic profile. This is not the user's actual init.vim:
that final handoff check still requires an authorized copy in the VM.

S3 is deliberately not started: this VM only has `vim.tiny` with `-eval` and
`-popupwin`. Adding full Vim requires separate approval. The native runtime is
still opt-in; no plugin entry was switched and no denops files were deleted.
Full migration completion must not be inferred from the native tests passing.

Cross-window Visual review: both the old `win_gotoid()` route and the native
`nvim_set_current_win()` route keep Visual mode active when entering another
buffer. The selection anchor's coordinates carry over. No destructive operator
was run. Whether this should be blocked or exit Visual mode is a behavior choice
for review; same-window Visual anchor preservation is regression-tested.
