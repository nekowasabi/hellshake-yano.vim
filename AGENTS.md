# Repository Guidelines

## rule

- 必ず日本語で返答すること

## Project Structure & Module Organization

- `plugin/hellshake-yano-native.vim`: Neovim (>=0.10) entry; starts the Lua native runtime by default. Vim uses it only with `g:hellshake_yano_native=1`.
- `lua/hellshake_yano/`: Lua native runtime.
- `autoload/`: VimScript helpers, pure VimScript and Vim9 native.
- `tests-lua/`, `tests-vim9/`, `tests-vim/`: test suites.

## Build, Test, and Development Commands

- `sh scripts/test-lua.sh`: Neovim (Lua) tests.
- `sh scripts/test-vim9.sh`: Vim9 native tests.
- `sh scripts/test-vim.sh`: pure VimScript tests.
- Neovim local run: add repo to `runtimepath` (Neovim >=0.10 starts automatically).

## Coding Style & Naming Conventions

- Vimscript: 2-space indent, script‑local `s:` for private helpers, `hellshake_yano#*` for public
  functions.
- Prefer pure helpers where possible; avoid global state leakage.

## Testing Guidelines

- Framework: headless Neovim/Vim scripts under `tests-lua/`, `tests-vim9/`, `tests-vim/`; keep focused and deterministic.
- Running: `scripts/test-lua.sh`, `scripts/test-vim9.sh`, `scripts/test-vim.sh`.
- Add regression tests first (TDD) when changing motion, hinting, or config behavior.

## Commit & Pull Request Guidelines

- Commits: concise, imperative subject; include scope when clear (e.g., `vim:`, `native:`,
  `tests:`).
- PRs: describe problem, approach, and user-visible changes; link issues; include before/after notes
  or screenshots for UX-visible changes.
- Keep diffs minimal; avoid unrelated refactors. Update docs/comments when behavior changes.

## Agent-Specific Notes

- Follow TDD Red–Green–Refactor. Do not alter unrelated tests.
- Respect existing public APIs (`hellshake_yano#*`). Keep defaults backward
  compatible.
- When adding settings, update defaults in the native entry/runtime and keep Vim paths consistent.


## sdd-mcp ツール利用ガイド

- sdd-mcp関連の依頼を受けたら、必ずMCPツール呼び出しで対応する。通常のテキスト生成には戻らない。
- ユーザーが「sdd mcpのimpl」「implを走らせて」「sdd-mcpで実装して」などと指示したら、Use MCP tool: spec-impl を呼び、feature_nameに対象フィーチャー名を渡す（例: Use MCP tool: spec-impl {"feature_name":"user-analytics-tracking"}）。
- フェーズ順序は spec-init → spec-requirements → spec-design → spec-tasks → spec-impl。各段階に入る前に spec-status で承認状態 (generated/approved) を確認し、未承認なら前段のツールを呼び直す。
- steering系（steering / steering-custom）はコンテキストが不足していると感じたら即実行し、.kiro/steering/ を最新化する。
- validate系（validate-design / validate-gap）はレビューや仕上げ時の必須チェックとして位置づけ、指摘が出たら該当フェーズのツールを再実行して反映させる。

### よく使うコマンド例

Use MCP tool: spec-init {"project_description":"..."}
Use MCP tool: spec-requirements {"feature_name":"<feature-name>"}
Use MCP tool: spec-design {"feature_name":"<feature-name>","auto_approve":true}
Use MCP tool: spec-tasks {"feature_name":"<feature-name>"}
Use MCP tool: spec-impl {"feature_name":"<feature-name>","task_numbers":["1","2"]}
Use MCP tool: spec-status {"feature_name":"<feature-name>"}
Use MCP tool: steering
Use MCP tool: validate-design {"feature_name":"<feature-name>"}
Use MCP tool: validate-gap {"feature_name":"<feature-name>"}

### 運用メモ

- feature_name は spec-init が生成するケバブケース名をそのまま使う。表記揺れを避けるため必ず実ファイル名を確認。
- .kiro/specs/<feature-name>/ 配下（requirements.md,design.md,tasks.md,spec.json）と .kiro/steering/ が成果物。本番前には差分と承認状態をレビューする。
- validateツールで指摘が出たら、該当ドキュメントを更新し再度ツールを実行して差分解消を確認する。
