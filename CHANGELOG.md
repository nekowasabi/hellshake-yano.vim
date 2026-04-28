# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- **`hideHintsOptimized` の空 catch を解消し ERROR ログを出力** (Process 02)
  - `nvim_buf_clear_namespace` 失敗時にエラーが握り潰されていた問題を修正
  - `logMessage("ERROR", "hellshake-yano", ...)` で常時出力（debug flag 非依存）
- **`cleanupPlugin` で `pluginState.performanceMetrics` をリセット** (Process 01)
  - debug 経路で長期セッションを回した際の潜在的リーク対策
  - 4 配列 (showHints/hideHints/wordDetection/hintGeneration) を空配列に再代入

### Added

- **連続失敗抑制カウンタ (`extmarkClearErrorCount`)** (Process 03)
  - hot path での ERROR ログ氾濫を防止
  - 初回 + `EXTMARK_ERROR_LOG_INTERVAL` (100) 回ごとのみ出力
  - `cleanupPlugin` でカウンタリセット
- **debug-mode 配下の timing instrumentation** (Process 04 / 05 / 06)
  - `displayHintsWithExtmarksBatch` 全体所要時間 / callAtomic バッチ回数 / 総 extmark 数を記録
  - `nvim_buf_clear_namespace` 所要時間を記録
  - 出力先: `logMessage("DEBUG", "hellshake-yano:perf", ...)`
  - debugMode 無効時は `performance.now()` 呼び出し含めゼロコスト (early evaluate)
- **新規 [REGRESSION] テスト 4 件** (Process 10 / 11 / 20 / 21 + Process 06 のテスト)
  - `tests/cleanup_plugin_test.ts`
  - `tests/hide_hints_error_logging_test.ts`
  - `tests/error_throttling_test.ts`
  - `tests/display_hints_timing_test.ts`
  - `tests/clear_namespace_timing_test.ts`

### Changed

- **Dictionary hint pipeline optimization** — 84.5% latency reduction (6.46x faster) in hint display
  for large files
  - getline array caching with `changedtick` invalidation to skip redundant RPC calls
  - TextChanged autocmd for reliable cache invalidation on buffer modifications
  - Line-by-line regex traversal replacing `join("\n")` bulk string approach
  - RegExp pre-compilation at dictionary load time into `compiled` field
- Measured on 44,949-line buffer: 1636ms -> 253ms
- No configuration changes required — all improvements are transparent to users
- No breaking changes
