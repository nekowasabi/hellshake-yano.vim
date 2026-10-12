# hellshake-yano native Neovim feature map

| Feature | File | Covered by `verify.py` |
| --- | --- | --- |
| Hint display from counted motions | [hint-display.md](hint-display.md) | yes (`e2e_ms`, `engine_ms`) |
| Repeated display without slowdown or leaks | [repeated-display.md](repeated-display.md) | yes (head/tail, leak checks) |
| Multi-window labels and prefix input | [multi-window-prefix.md](multi-window-prefix.md) | partly (`prefix_ms`, vsplit layout); jump target is in `tests-lua/test_multiwindow.lua` |
