# Handoff (hy-plan, 2026-10-11 15:37 JST)
Repo nekowasabi/hellshake-yano.vim, branch feat/remove-denops, HEAD 35b46d8 (base main d8fe9db). Draft PR only, no merge or force-push. WSL clone ~/repos/hellshake-yano.vim on takets-pc (push via SSH). The user's live install ~/.config/nvim/plugged/hellshake-yano.vim is read-only.
Done: S1 (Claude Code, f5c8155) parity table docs/denops-parity.md + scripts/test-{vim,nvim}.sh. S2a (Codex, 35b46d8) known-failures gate, exit-code based tests, plugged-path test fix. Tests: vim and nvim both PASS 21 / KNOWN 20 / FAIL 0 / SKIP 13, exit 0.
Open before S2: (1) KNOWN 20 > main failures 17/18: diff against d8fe9db results so no new failure is hidden. (2) scripts/test-vim-gate.py vs scripts/vim-test-gate.py overlap; keep one.
Next: S2 Lua core for Neovim (Codex), S3 Vim9 + plugin entry switch + delete denops/ (Grok Build, still unused), S4 gaps + README. Final check: user nvim config with plugged removed from rtp, log &rtp and :scriptnames.
Evidence: dispatch.tsv, logs/S1, logs/S2. Local execution on takets-pc drops ~11 min after app start; keep CLI runs <10 min, push each.
