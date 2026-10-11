# Current checkpoint (2026-10-11, dot VM)

The approved S2 checkpoint was published to `feat/remove-denops` as
`0135632f9a76fe9a8b3f22b9d7fc5e3d14e92917`. Its tree is byte-for-byte equivalent
to original local `265f393`; publishing through the connected GitHub API changed
commit IDs. All 16 original IDs are preserved in commit trailers and in the
review artifact's mapping. No force update, merge or deployment occurred.

Full Vim and its runtime were subsequently approved and installed workspace-local
from checksum-verified Debian packages. S3 now has a tested, explicit opt-in Vim9
runtime and Vimscript bridge. See `docs/native-vim-progress.md` for current scope,
test commands and the exact cutover gates. These additional commits are local at
this checkpoint; publication of the original 16 commits does not mean all later
work has reached the remote. A default-OFF `g:hellshake_yano_native` startup
flag now selects native setup/bridge/activation and guards the three old entry
files only when explicitly enabled. Default startup and denops remain intact.

The user's actual init.vim is still unavailable here. Synthetic Neovim and Vim
profiles record rtp/scriptnames but do not complete that final requirement.

---

## Historical handoff and earlier checkpoints

### Handoff (hy-plan, 2026-10-11 15:37 JST)
Repo nekowasabi/hellshake-yano.vim, branch feat/remove-denops, HEAD 35b46d8 (base main d8fe9db). Draft PR only, no merge or force-push. WSL clone ~/repos/hellshake-yano.vim on takets-pc (push via SSH). The user's live install ~/.config/nvim/plugged/hellshake-yano.vim is read-only.
Done: S1 (Claude Code, f5c8155) parity table docs/denops-parity.md + scripts/test-{vim,nvim}.sh. S2a (Codex, 35b46d8) known-failures gate, exit-code based tests, plugged-path test fix. Tests: vim and nvim both PASS 21 / KNOWN 20 / FAIL 0 / SKIP 13, exit 0.
Resolved before S2 (hy-critique, measured on box vim 9.1 / nvim 0.10.4): (1) KNOWN 20 > main failures 17/18 is fine: running main d8fe9db with the new gate gives the same 20 known failures; the old script counted tests as PASS even when an assert_* failed inside them (e.g. test_jump_multi.vim). (2) The gate exits 1 when a test not in the list breaks (checked by breaking test_jump_multi.vim line 56). (3) scripts/test-vim-gate.py is the unit test for the gate itself (scripts/vim-test-gate.py); renaming it is optional.
Next: S2 Lua core for Neovim (Codex), S3 Vim9 + plugin entry switch + delete denops/ (Grok Build, still unused), S4 gaps + README. Final check: user nvim config with plugged removed from rtp, log &rtp and :scriptnames.
Evidence: dispatch.tsv, logs/S1, logs/S2. Local execution on takets-pc drops ~11 min after app start; keep CLI runs <10 min, push each.

## S2 native checkpoint (dot VM, 2026-10-11)

Continued from remote `7ff640a` using Astra in the dot VM only. The new native Lua
runtime is opt-in (`require('hellshake_yano').setup(); require('hellshake_yano').activate()`).
See `docs/native-lua-progress.md` for API scope, verification, and explicit gaps.
No existing plugin entry changed; denops has not been deleted. No push/PR/merge.

Verified with official Neovim 0.10.4: all 10 Lua suites, actual-grid UI integration,
synthetic user-profile E2E, old gate PASS 21 / KNOWN 20 / FAIL 0 / SKIP 13, and all
6 gate unit tests. TinySegmenter: 27 pinned upstream fixtures plus 1,000 seeded
random cases match; hint generation: 500 seeded cases match existing TypeScript.
Runtimepath and scriptnames were recorded for the synthetic profile, not the
user's real init.vim. Do not describe the final live-config check as completed.

Next: review the explicit dictionary/YAML/regex compatibility gaps and input
behavior differences before cutover; verify cross-window Visual behavior and
remaining public bridges. S3 needs approved full Vim in the VM (`vim.tiny` has
`-eval`/`-popupwin`), then Vim9/entry routing and removal. Do not install full Vim,
publish, or use the user's computer based on this handoff alone. The current user
request restricts all execution to the dot VM.

### Extended S2 checkpoint (2026-10-11, dot VM)

The native bridge now routes all 61 named Neovim dispatcher APIs when explicitly
opted in. `autoload/hellshake_yano/*` uses a transport which still forwards to
real denops by default; other plugins are never intercepted. Native activation
and bridge activation are separate. Tests use a clean `-u NONE` session. Existing
plugin commands and `autoload/hellshake_yano_vim/*` have not been cut over.

Verification now includes 15 Lua suites, real-grid UI, 36 checked-in regex-word
fixtures, 3,042 extra word-extraction comparisons, 1,000 dispatcher-motion events,
and 2,016 Japanese postprocessing comparisons. A 10-cycle/336-target rendering
stress check leaves window/buffer counts stable. The old gate remains unchanged
at PASS 21 / KNOWN 20 / FAIL 0 / SKIP 13.

JSON AddWord preserves fields and rejects corrupt/concurrently changed files;
YAML/text writes are explicitly rejected unchanged. This intentionally fixes the
old writer's `words` versus reader's `customWords` mismatch. Full YAML/ECMAScript,
mergeRules/compoundPatterns execution and dictionary search-path precedence are
still compatibility limits, not validated completion. See native-lua-progress.md.

Next executable boundary is S3's full-Vim implementation/testing and entry
cutover, requiring the full-Vim installation approval already identified. The
final real-init check also needs an authorized copy of that init in this VM.
Neither blocker is a reason to describe S2 parity or the denops removal as done.
