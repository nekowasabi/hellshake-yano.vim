# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- **Dictionary hint pipeline optimization** — 84.5% latency reduction (6.46x faster) in hint display for large files
  - getline array caching with `changedtick` invalidation to skip redundant RPC calls
  - TextChanged autocmd for reliable cache invalidation on buffer modifications
  - Line-by-line regex traversal replacing `join("\n")` bulk string approach
  - RegExp pre-compilation at dictionary load time into `compiled` field
- Measured on 44,949-line buffer: 1636ms -> 253ms
- No configuration changes required — all improvements are transparent to users
- No breaking changes
