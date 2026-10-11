#!/usr/bin/env bash
# Native Lua tests need Neovim >= 0.10; no plugins or package manager required.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"
BIN=${NVIM_BIN:-nvim}
command -v "$BIN" >/dev/null || { echo "$BIN not found" >&2; exit 2; }
export NVIM_LOG_FILE=${NVIM_LOG_FILE:-${TMPDIR:-/tmp}/hellshake-yano-lua.log}
for test in tests-lua/test_*.lua; do
  echo "[TEST] $test"
  timeout "${TEST_TIMEOUT:-60}" "$BIN" --headless -u NONE -i NONE -n -l "$test"
done
