#!/usr/bin/env bash
# Opt-in Vim9 unit/integration tests. Requires Vim 9 with +popupwin, not Neovim.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"
BIN=${VIM_BIN:-vim}
command -v "$BIN" >/dev/null || { echo "$BIN not found" >&2; exit 2; }
for test in tests-vim9/test_*.vim; do
  echo "[TEST] $test"
  log=$(mktemp "${TMPDIR:-/tmp}/hellshake-yano-vim9.XXXXXX")
  if ! timeout "${TEST_TIMEOUT:-60}" "$BIN" -N -u NONE -i NONE -n -es -V1"$log" --cmd "set rtp^=$ROOT" -S "$test"; then
    cat "$log" >&2
    exit 1
  fi
  rm "$log"
done
