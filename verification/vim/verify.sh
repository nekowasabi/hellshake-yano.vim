#!/bin/sh
# Vim surface: no-denops startup, then the Vim9 unit + popup UI suite.
# Exit 0 pass, 1 fail, 2 doctor fail. Evidence: verification/evidence/<run>/vim/.
set -eu
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
EVIDENCE=${HY_EVIDENCE:-$ROOT/verification/evidence/$(date +%Y%m%d-%H%M%S)}/vim
mkdir -p "$EVIDENCE"
BIN=${VIM_BIN:-vim}

# Doctor
command -v "$BIN" >/dev/null || { echo "doctor: $BIN not found" >&2; exit 2; }
"$BIN" -N -u NONE -i NONE -n -es -c 'if has("nvim") || !has("vim9script") || !has("popupwin") | cquit | endif' -c 'qa!' ||
  { echo "doctor: $BIN must be Vim 9 with +popupwin" >&2; exit 2; }

# Drive 1: start with the repo on rtp and no denops.
HY_OUT="$EVIDENCE/startup.txt" "$BIN" -N -u NONE -i NONE -n -es \
  --cmd "set rtp^=$ROOT" --cmd 'let g:hellshake_yano_native = 1' \
  --cmd "let g:hellshake_yano = {'perKeyMotionCount': {'w': 2}}" \
  -c 'runtime! plugin/*.vim' -c "source $ROOT/verification/startup-check.vim" ||
  { echo "FAIL vim startup: see $EVIDENCE/startup.txt"; exit 1; }
echo "PASS vim startup (no denops)"

# Drive 2: Vim9 unit tests and popup UI tests (real terminal Vim via tests-ui/).
VIM_BIN="$BIN" "$ROOT/scripts/test-vim9.sh" >"$EVIDENCE/test-vim9.txt" 2>&1 ||
  { echo "FAIL vim test-vim9: see $EVIDENCE/test-vim9.txt"; exit 1; }
echo "PASS vim test-vim9"
