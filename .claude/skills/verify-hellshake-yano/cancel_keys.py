#!/usr/bin/env python3
"""cancelKeys verifier: every key in the user's cancelKeys must close the hints AND
still do its normal Vim job, exactly as if no hints were shown.

For each key, two isolated runs from the same buffer/cursor:
  control: hints disabled, type `w w <key> <probe>`
  test:    hints enabled,  type `w w` (hints appear), `<key> <probe>`
then compare the observable end state (mode, cursor, topline, buffer text).
`<probe>` is `j`: it makes a pending count / operator / f-target visible.
Exit 0 = every key matches, 1 = some key differs, 2 = doctor failed.
"""
import argparse
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from verify import EVIDENCE_ROOT, FIXTURE_LUA, Neovim, doctor, init_vim_config  # noqa: E402

STATE_LUA = r"""
local w = vim.api.nvim_get_current_win()
return {mode = vim.api.nvim_get_mode().mode, cursor = vim.api.nvim_win_get_cursor(w),
  topline = vim.fn.line('w0'), text = table.concat(vim.api.nvim_buf_get_lines(0, 0, -1, false), '\n'),
  visible = require('hellshake_yano.core').get_state().visible}
"""


def cancel_keys(block):
    """The cancelKeys list as written in init.vim (Vim string literals)."""
    match = re.search(r"'cancelKeys'\s*:\s*\[(.*?)\]", block, re.S)
    return re.findall(r"'([^']*)'", match.group(1)) if match else []


def start(out, block, layout):
    nvim = Neovim(os.path.join(out, "nvim.log"))
    nvim.rpc("nvim_ui_attach", [120, 40, {"rgb": True, "ext_linegrid": True}])
    nvim.rpc("nvim_exec2", [block, {}])
    nvim.lua("vim.cmd('enew!')" + FIXTURE_LUA)
    if layout:
        nvim.lua("vim.cmd('vsplit'); vim.cmd('wincmd t')")
    nvim.lua("local h = require('hellshake_yano'); h.setup(vim.g.hellshake_yano); h.activate()")
    return nvim


def reset(nvim):
    # Leave whatever mode the previous key left (insert, visual, pending f/count).
    nvim.rpc("nvim_input", ["<Esc><Esc>"])
    time.sleep(0.1)
    nvim.lua("vim.cmd('stopinsert'); require('hellshake_yano.core').hide()"
             + FIXTURE_LUA + "vim.api.nvim_win_set_cursor(0, {150, 10}); vim.cmd('normal! zz')"
             + "; require('hellshake_yano.motion').reset(); vim.v.errmsg = ''")


def play(nvim, key, hints, gap):
    nvim.lua("require('hellshake_yano').%s()" % ("enable" if hints else "disable"))
    reset(nvim)
    nvim.rpc("nvim_input", ["w"])
    time.sleep(gap)  # above keyRepeatThreshold: a human second press
    nvim.rpc("nvim_input", ["w"])
    shown = None
    if hints:
        nvim.wait_visible(True)
        shown = nvim.screen()
    else:
        time.sleep(0.15)
    nvim.rpc("nvim_input", [key])
    time.sleep(0.15)
    nvim.rpc("nvim_input", ["j"])
    time.sleep(0.15)
    state = nvim.lua(STATE_LUA)
    state["errmsg"] = nvim.lua("return vim.v.errmsg")
    return state, shown


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keys", nargs="*", help="override the cancelKeys read from init.vim")
    parser.add_argument("--out", default=os.path.join(EVIDENCE_ROOT, "cancel-" + time.strftime("%Y%m%d-%H%M%S")))
    parser.add_argument("--single", action="store_true", help="no vsplit (one window)")
    parser.add_argument("--key-gap", type=float, default=0.08)
    args = parser.parse_args()
    os.makedirs(args.out, exist_ok=True)
    block = init_vim_config()
    if not block:
        print("DOCTOR FAIL: no `let g:hellshake_yano = {` block in init.vim")
        sys.exit(2)
    keys = args.keys or cancel_keys(block)
    nvim = start(args.out, block, not args.single)
    report, exit_code = [], 0
    try:
        problems = doctor(nvim)
        if problems:
            print("DOCTOR FAIL: " + "; ".join(problems))
            sys.exit(2)
        for key in keys:
            control, _ = play(nvim, key, False, args.key_gap)
            test, screen = play(nvim, key, True, args.key_gap)
            diff = [f for f in ("mode", "cursor", "topline", "text") if control[f] != test[f]]
            if test["visible"]:
                diff.append("hints still visible")
            ok = not diff
            exit_code = max(exit_code, 0 if ok else 1)
            row = {"key": key, "ok": ok, "diff": diff,
                   "control": {k: v for k, v in control.items() if k != "text"},
                   "test": {k: v for k, v in test.items() if k != "text"}}
            report.append(row)
            if not ok:
                with open(os.path.join(args.out, f"screen-{re.sub(r'[^A-Za-z0-9]', '_', key)}.txt"), "w") as f:
                    f.write(screen or "")
            print(f"{'PASS' if ok else 'FAIL'} {key!r:8} "
                  + ("" if ok else "differs in " + ", ".join(diff)
                     + f"  (control mode={control['mode']} cursor={control['cursor']} top={control['topline']}"
                     + f" / test mode={test['mode']} cursor={test['cursor']} top={test['topline']})"))
    finally:
        nvim.close()
    with open(os.path.join(args.out, "cancel-keys.json"), "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print("evidence:", args.out)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
