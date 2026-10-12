# hellshake-yano verification feature map

`sh verification/nvim/verify.sh && sh verification/vim/verify.sh` is the `## verify` line for `/x`.
Exit 0 pass, 1 fail, 2 doctor fail. Evidence goes to `verification/evidence/<YYYYmmdd-HHMMSS>/{nvim,vim}/`
(gitignored, never deleted by the scripts; set `HY_EVIDENCE` to choose the directory).

| Feature | File | nvim/verify.sh | vim/verify.sh |
| --- | --- | --- | --- |
| Startup without denops | [no-denops-startup.md](no-denops-startup.md) | yes | yes |
| Hint display from counted motions | [../../.claude/skills/verify-hellshake-yano/features/hint-display.md](../../.claude/skills/verify-hellshake-yano/features/hint-display.md) | yes (`verify.py --profile single`) | via `tests-vim9/*ui.vim` |
| Repeated display without slowdown or leaks | [../../.claude/skills/verify-hellshake-yano/features/repeated-display.md](../../.claude/skills/verify-hellshake-yano/features/repeated-display.md) | yes (30 cycles; run `verify.py` directly for 100 cycles, `init` profile) | no |
| Multi-window labels and prefix input | [../../.claude/skills/verify-hellshake-yano/features/multi-window-prefix.md](../../.claude/skills/verify-hellshake-yano/features/multi-window-prefix.md) | partly (`prefix_ms`) | no |

The Neovim RPC harness and its details live in `.claude/skills/verify-hellshake-yano/SKILL.md`.
