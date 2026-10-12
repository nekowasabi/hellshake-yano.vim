#!/bin/sh
# Neovim surface: no-denops startup, Lua suite, then hint latency/leak drive.
# Exit 0 pass, 1 fail, 2 doctor fail. Evidence: verification/evidence/<run>/nvim/.
set -eu
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
EVIDENCE=${HY_EVIDENCE:-$ROOT/verification/evidence/$(date +%Y%m%d-%H%M%S)}/nvim
mkdir -p "$EVIDENCE"

# Doctor
command -v nvim >/dev/null || { echo "doctor: nvim not found" >&2; exit 2; }
nvim --headless -u NONE -i NONE -n -c 'if !has("nvim-0.10") | cquit | endif' -c 'qa!' ||
  { echo "doctor: Neovim 0.10+ required" >&2; exit 2; }

# Drive 1: start like a user's plugin manager would (-u NONE, repo on rtp, no denops).
HY_OUT="$EVIDENCE/startup.txt" nvim --headless -u NONE -i NONE -n \
  --cmd "set rtp^=$ROOT" --cmd 'let g:hellshake_yano_native = 1' \
  --cmd "let g:hellshake_yano = {'perKeyMotionCount': {'w': 2}}" \
  -c 'runtime! plugin/*.vim' -c "source $ROOT/verification/startup-check.vim" ||
  { echo "FAIL nvim startup: see $EVIDENCE/startup.txt"; exit 1; }
echo "PASS nvim startup (no denops)"

# Drive 2: Lua unit/integration suite.
"$ROOT/scripts/test-lua.sh" >"$EVIDENCE/test-lua.txt" 2>&1 ||
  { echo "FAIL nvim test-lua: see $EVIDENCE/test-lua.txt"; exit 1; }
echo "PASS nvim test-lua"

# Drive 3: real motion keys over RPC (latency, degradation, leaks).
"$ROOT/.claude/skills/verify-hellshake-yano/verify.py" --profile single --cycles "${HY_CYCLES:-30}" \
  --out "$EVIDENCE/verify-py" \
  >"$EVIDENCE/verify-py.txt" 2>&1 || { status=$?; cat "$EVIDENCE/verify-py.txt"; exit "$status"; }
cat "$EVIDENCE/verify-py.txt"
