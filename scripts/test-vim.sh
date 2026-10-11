#!/usr/bin/env bash
# Run every tests-vim/ file headless and print a pass/fail summary.
# Usage: scripts/test-vim.sh [--nvim]   (scripts/test-nvim.sh is the nvim entry point)
# Requires Python 3 (standard library only) for per-test failure matching.
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

# Why: Exit codes are primary; grep only covers legacy tests that bypass the
# VimLeavePre check. Matching individual identities still happens below.
FAIL_RE='^[[:space:]]*✗|^[[:space:]]*FAIL:|\[FAIL\]|FAIL \[Test|^[[:space:]]*FAILED:|RESULT: FAILURE|Some tests failed|SOME TESTS FAILED|EXCEPTION:|AssertionError:|Assertion failed|^E[0-9]+:|HY_TEST_FAIL'
# Individual failure identities are matched by vim-test-gate.py.
RECORDS="$LOG_DIR/results.tsv"
: > "$RECORDS"

"$BIN" --version | sed -n '1,2p'
echo

for f in tests-vim/*.vim tests-vim/hellshake_yano_vim/*.vim; do
  if grep -q 'themis#suite' "$f"; then
    echo "[SKIP] $f (requires vim-themis)"
    printf '%s\tskip\t-\n' "$f" >> "$RECORDS"
    continue
  fi

  log="$LOG_DIR/$(echo "$f" | tr '/' '_').log"
  # The file is opened as the current buffer because many tests only run
  # when expand('<sfile>:p') ==# expand('%:p'). :redir cannot be used for
  # capture since the runner's own nested :redir would cut it off.
  # RunTests() is the documented entry point of files that do not self-run.
  timeout "$TIMEOUT" "$BIN" "${ARGS[@]}" \
    --cmd "set rtp^=$ROOT" --cmd "set verbosefile=$log" \
    --cmd "source $ROOT/scripts/check-vim-test-exit.vim" \
    -c 'source %' -c 'if exists("*RunTests") | call RunTests() | endif' \
    -c 'qall!' "$f" </dev/null >/dev/null 2>&1
  code=$?
  touch "$log"
  if [ "$code" -eq 0 ] && grep -aqE "$FAIL_RE" "$log"; then
    code=1
  fi

  printf '%s\t%s\t%s\n' "$f" "$code" "$log" >> "$RECORDS"
done

echo "Logs: $LOG_DIR"
python3 "$ROOT/scripts/vim-test-gate.py" "$NAME" "$RECORDS" \
  "$ROOT/tests-vim/known-failures.txt"
