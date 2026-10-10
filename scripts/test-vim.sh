#!/usr/bin/env bash
# Run every tests-vim/ file headless and print a pass/fail summary.
# Usage: scripts/test-vim.sh [--nvim]   (scripts/test-nvim.sh is the nvim entry point)
# Env: VIM_BIN / NVIM_BIN override the editor binary, TEST_TIMEOUT is seconds per file.
set -u

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
# Several tests source autoload/ and tests-vim/ with paths relative to the repo root.
cd "$ROOT" || exit 2

if [ "${1:-}" = "--nvim" ]; then
  NAME=nvim
  BIN=${NVIM_BIN:-nvim}
  ARGS=(--headless -u NONE -i NONE -n)
else
  NAME=vim
  BIN=${VIM_BIN:-vim}
  ARGS=(-N -u NONE -i NONE -n -es)
fi
TIMEOUT=${TEST_TIMEOUT:-60}

if ! command -v "$BIN" >/dev/null 2>&1; then
  echo "$BIN not found" >&2
  exit 2
fi

LOG_DIR=$(mktemp -d "${TMPDIR:-/tmp}/hellshake-yano-$NAME-tests.XXXXXX")

# Test files use several ad-hoc reporting styles and most never set an exit code,
# so the verdict is read from the captured messages. Patterns are anchored because
# the runner's `silent! function` listing leaks names like Test_AssertEqual_failure.
FAIL_RE='^[[:space:]]*✗|^Failed: *[1-9]|FAIL:|\[FAIL\]|FAIL \[Test|FAILED|RESULT: FAILURE|Some tests failed|EXCEPTION|AssertionError|Assertion failed|^E[0-9]+:'
# Vim echoes the opened file name; anything else means the test actually ran.
FILE_LINE_RE='^[[:space:]]*$|^"tests-vim/'

pass=0
fail=0
skip=0

"$BIN" --version | sed -n '1,2p'
echo

for f in tests-vim/*.vim tests-vim/hellshake_yano_vim/*.vim; do
  # The runner is a library sourced by other tests, not a test file.
  [ "$(basename "$f")" = test_runner.vim ] && continue

  if grep -q 'themis#suite' "$f"; then
    echo "[SKIP] $f (requires vim-themis)"
    skip=$((skip + 1))
    continue
  fi

  log="$LOG_DIR/$(echo "$f" | tr '/' '_').log"
  # The file is opened as the current buffer because many tests only run
  # when expand('<sfile>:p') ==# expand('%:p'). :redir cannot be used for
  # capture since the runner's own nested :redir would cut it off.
  # RunTests() is the documented entry point of files that do not self-run.
  timeout "$TIMEOUT" "$BIN" "${ARGS[@]}" \
    --cmd "set rtp^=$ROOT" --cmd "set verbosefile=$log" \
    -c 'source %' -c 'if exists("*RunTests") | call RunTests() | endif' \
    -c 'qall!' "$f" </dev/null >/dev/null 2>&1
  code=$?
  touch "$log"

  reason=
  if [ "$code" -eq 124 ]; then
    reason="timeout after ${TIMEOUT}s"
  elif [ "$code" -ne 0 ]; then
    reason="exit $code"
  elif grep -aqE "$FAIL_RE" "$log"; then
    reason="failure output"
  elif ! grep -aqvE "$FILE_LINE_RE" "$log"; then
    reason="no test output"
  fi

  if [ -z "$reason" ]; then
    echo "[PASS] $f"
    pass=$((pass + 1))
  else
    echo "[FAIL] $f ($reason)"
    grep -aE "$FAIL_RE" "$log" | sed -n '1,5s/^/    /p'
    fail=$((fail + 1))
  fi
done

echo
echo "$NAME: PASS $pass  FAIL $fail  SKIP $skip  (logs: $LOG_DIR)"
[ "$fail" -eq 0 ]
