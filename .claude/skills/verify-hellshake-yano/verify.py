#!/usr/bin/env python3
"""Hint generation speed / no-degradation verifier for the native Neovim runtime.

Drives an isolated `nvim --embed -u NONE` (repo on rtp) over msgpack RPC with a
UI attached, triggers hints through the real motion keys (`w` x2), and records
per-cycle latency plus leak indicators. Exit 0 = PASS, 1 = FAIL, 2 = doctor failed.
"""
import argparse
import json
import os
import select
import statistics
import subprocess
import sys
import time

try:
    import msgpack
except ImportError:
    print("doctor: python msgpack missing (pip install msgpack)", file=sys.stderr)
    sys.exit(2)

# HY_RTP: verify another checkout (e.g. ~/.config/nvim/plugged/hellshake-yano.vim).
REPO = os.path.abspath(os.environ.get("HY_RTP") or
                       os.path.join(os.path.dirname(__file__), "..", "..", ".."))
EVIDENCE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..",
                                             "tmp", "verify-evidence"))

INIT_VIM = os.path.expanduser(os.environ.get("HY_INIT", "~/.config/nvim/init.vim"))


def init_vim_config():
    """The user's `let g:hellshake_yano = {...}` block (with `\\` continuations), verbatim."""
    lines, taking = [], False
    with open(INIT_VIM, encoding="utf-8") as f:
        for line in f:
            if line.startswith("let g:hellshake_yano = {"):
                taking = True
            elif taking and not line.lstrip().startswith("\\"):
                break
            if taking:
                lines.append(line.rstrip("\n"))
    return "\n".join(lines) or None


# "init": the live init.vim settings (multiWindowMode -> floats). "single": defaults
# except trigger count, covering the single-window extmark path.
PROFILES = {"init": None, "single": {"perKeyMotionCount": {"w": 2}}}

# 1-based fixture: mixed English/Japanese prose, enough to fill a 120x40 screen twice.
FIXTURE_LUA = r"""
local lines = {}
for i = 1, 400 do
  lines[i] = (i % 3 == 0) and ('非同期処理を実行します 日本語の文章を表示します line ' .. i)
    or ('alpha beta gamma delta epsilon zeta theta iota kappa lambda ' .. i)
end
vim.api.nvim_buf_set_lines(0, 0, -1, false, lines)
"""

# Harness-only instrumentation: wrap module fields the runtime looks up per call.
INSTRUMENT_LUA = r"""
local core, words = require('hellshake_yano.core'), require('hellshake_yano.words')
_G.__hy = {detect = {}, show = {}}
local detect, show = words.detect, core.show
words.detect = function(...)
  local t = vim.uv.hrtime(); local r = detect(...)
  table.insert(_G.__hy.detect, (vim.uv.hrtime() - t) / 1e6); return r
end
core.show = function(...)
  local t = vim.uv.hrtime(); local r = show(...)
  table.insert(_G.__hy.show, (vim.uv.hrtime() - t) / 1e6); return r
end
"""

SNAPSHOT_LUA = r"""
local ns = require('hellshake_yano.core').namespace
local marks = 0
for _, b in ipairs(vim.api.nvim_list_bufs()) do
  if vim.api.nvim_buf_is_loaded(b) then
    marks = marks + #vim.api.nvim_buf_get_extmarks(b, ns, 0, -1, {})
  end
end
collectgarbage('collect')
-- Only hint floats count: other plugins (in --full-init) show their own floats.
local shown = 0
for _, w in ipairs(vim.api.nvim_list_wins()) do
  if not vim.api.nvim_win_get_config(w).hide and vim.wo[w].winhighlight:find('HellshakeYano') then
    shown = shown + 1
  end
end
return {wins = #vim.api.nvim_list_wins(), bufs = #vim.api.nvim_list_bufs(), shown_wins = shown,
  extmarks = marks, lua_kb = collectgarbage('count'),
  visible = require('hellshake_yano.core').get_state().visible}
"""


class Neovim:
    def __init__(self, log, full_init=False):
        # full_init: the user's whole init.vim and plugins (plugin startup activates native).
        init = [] if full_init else ["-u", "NONE"]
        self.process = subprocess.Popen(
            [os.environ.get("NVIM_BIN", "nvim"), "--embed", "--headless", *init, "-i", "NONE",
             "-n", "--cmd", "set rtp^=" + REPO],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            env={**os.environ, "NVIM_LOG_FILE": log},
        )
        self.unpacker = msgpack.Unpacker(raw=False, ext_hook=lambda code, data: msgpack.unpackb(data))
        self.sequence = 0
        self.grid = []

    def _redraw(self, events):
        for name, *updates in events:
            for update in updates:
                if name == "grid_resize" and update[0] == 1:
                    self.grid = [[" "] * update[1] for _ in range(update[2])]
                elif name == "grid_clear" and update[0] == 1:
                    self.grid = [[" "] * len(row) for row in self.grid]
                elif name == "grid_line" and update[0] == 1:
                    _, row, col, cells, *_ = update
                    for cell in cells:
                        for _ in range(cell[2] if len(cell) > 2 else 1):
                            self.grid[row][col] = cell[0]
                            col += 1

    def rpc(self, method, args=None, timeout=10):
        self.sequence += 1
        self.process.stdin.write(msgpack.packb([0, self.sequence, method, args or []]))
        self.process.stdin.flush()
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            for message in self.unpacker:
                if message[0] == 1 and message[1] == self.sequence:
                    if message[2]:
                        raise RuntimeError(message[2])
                    return message[3]
                if message[0] == 2 and message[1] == "redraw":
                    self._redraw(message[2])
            if select.select([self.process.stdout], [], [], max(0, deadline - time.monotonic()))[0]:
                chunk = os.read(self.process.stdout.fileno(), 65536)
                if not chunk:
                    raise RuntimeError("Neovim closed its RPC connection")
                self.unpacker.feed(chunk)
        raise TimeoutError(method)

    def lua(self, code, *args):
        return self.rpc("nvim_exec_lua", [code, list(args)])

    def screen(self):
        self.rpc("nvim_command", ["redraw"])
        self.rpc("nvim_eval", ["1"])  # drain redraw notifications
        return "\n".join("".join(row) for row in self.grid)

    def wait_visible(self, want, timeout=3.0):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.lua("return require('hellshake_yano.core').get_state().visible") == want:
                return time.monotonic()
            # Back-to-back RPC requests starve typeahead inside vim.wait(); give input a turn.
            time.sleep(0.002)
        raise TimeoutError(f"hint visible != {want} after {timeout}s")

    def close(self):
        # Kill only the instance we started.
        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=5)


def doctor(nvim):
    info = nvim.lua("""
      local src = debug.getinfo(require('hellshake_yano').activate, 'S').source
      return {nvim = vim.fn.has('nvim-0.10'), src = src,
        map = vim.fn.maparg('w', 'n', false, true).desc or ''}
    """)
    problems = []
    if info["nvim"] != 1:
        problems.append("Neovim >= 0.10 required")
    if REPO not in info["src"]:
        problems.append(f"runtime not loaded from repo: {info['src']}")
    if "hellshake-yano" not in info["map"]:
        problems.append(f"w is not the native motion mapping: {info['map']!r}")
    return problems


def median(values):
    return statistics.median(values) if values else 0.0


def p95(values):
    return sorted(values)[max(0, int(len(values) * 0.95) - 1)] if values else 0.0


def run_profile(name, args, out):
    full = name == "init" and args.full_init
    nvim = Neovim(os.path.join(out, f"{name}-nvim.log"), full)
    try:
        nvim.rpc("nvim_ui_attach", [120, 40, {"rgb": True, "ext_linegrid": True}])
        nvim.lua("vim.cmd('enew!')" + FIXTURE_LUA)
        if full:
            if not nvim.lua("return vim.g.loaded_hellshake_yano_native"):
                return {"profile": name, "doctor": ["init.vim did not start the native runtime: "
                                                     + str(nvim.lua("return vim.g.hellshake_yano_native_error"))]}
            nvim.lua("vim.cmd('vsplit'); vim.cmd('split'); vim.cmd('enew!')" + FIXTURE_LUA
                     + "vim.cmd('wincmd t')")
        elif name == "init":
            block = init_vim_config()
            if not block:
                return {"profile": name, "doctor": [f"no `let g:hellshake_yano = {{` block in {INIT_VIM}"]}
            nvim.rpc("nvim_exec2", [block, {}])
            # vsplit (same buffer twice) + a split on a second buffer: the slow case reported.
            nvim.lua("vim.cmd('vsplit'); vim.cmd('split'); vim.cmd('enew')" + FIXTURE_LUA
                     + "vim.cmd('wincmd t')")
            nvim.lua("local h = require('hellshake_yano'); h.setup(vim.g.hellshake_yano); h.activate()")
        else:
            nvim.lua("local h = require('hellshake_yano'); h.setup(...); h.activate()", PROFILES[name])
        problems = doctor(nvim)
        if problems:
            return {"profile": name, "doctor": problems}
        nvim.lua(INSTRUMENT_LUA)
        # Startup/window-setup errors from other plugins are not ours; judge only the cycles.
        # The user's plugins raise E31 on the first w/B/<Esc> even with hints disabled
        # (control run), so play the cycle's keys once with hints off before judging.
        nvim.lua("require('hellshake_yano').disable()")
        for key in ("w", "w", "B", "<Esc>"):
            nvim.rpc("nvim_input", [key])
            time.sleep(0.1)
        nvim.lua("require('hellshake_yano').enable()")
        startup_errmsg = nvim.lua("local e = vim.v.errmsg; vim.v.errmsg = ''; return e")
        baseline = nvim.lua(SNAPSHOT_LUA)
        cycles, screens, stuck = [], {}, None
        for i in range(args.cycles):
            try:
                cycles.append(run_cycle(nvim, i, args, screens))
            except TimeoutError as error:
                # A display that never shows/hides is the freeze this verifier exists for.
                stuck = f"cycle {i}: {error}; state={nvim.lua('return require(\"hellshake_yano.core\").get_state().visible')}"
                screens["stuck"] = (nvim.screen(), [])
                break
        timing = nvim.lua("return _G.__hy")
        errmsg = nvim.lua("return vim.v.errmsg")
    finally:
        nvim.close()
    for i, cycle in enumerate(cycles):
        cycle["detect_ms"], cycle["show_ms"] = timing["detect"][i], timing["show"][i]
        cycle["engine_ms"] = cycle["detect_ms"] + cycle["show_ms"]
    for label, (text, labels) in screens.items():
        with open(os.path.join(out, f"{name}-screen-{label}.txt"), "w") as f:
            f.write(text + "\n\n# hint labels in current window: " + " ".join(labels) + "\n")
    # At least half of the current window's labels visible (others may sit under splits).
    on_screen = all(labels and sum(lbl in text for lbl in labels) * 2 >= len(labels)
                    for key, (text, labels) in screens.items() if key != "stuck")
    return {"profile": name, "baseline": baseline, "cycles": cycles, "errmsg": errmsg,
            "startup_errmsg": startup_errmsg, "stuck": stuck,
            "hint_on_screen": on_screen}


def run_cycle(nvim, i, args, screens):
    """One user-path display: w (gap) w -> visible, B -> prefix re-render, <Esc> -> hidden."""
    nvim.lua("vim.api.nvim_win_set_cursor(0, {150, 10}); require('hellshake_yano.motion').reset()")
    nvim.rpc("nvim_input", ["w"])
    # Measure the gap from when the first w was *processed*: if nvim is still busy
    # with the previous cycle, two sends 80ms apart can land <50ms apart (key-repeat).
    deadline = time.monotonic() + 3
    while nvim.lua("return vim.api.nvim_win_get_cursor(0)") == [150, 10]:
        if time.monotonic() > deadline:
            raise TimeoutError("first w did not move the cursor")
        time.sleep(0.002)
    time.sleep(args.key_gap)  # above keyRepeatThreshold (50ms): a human second press
    t0 = time.monotonic()
    nvim.rpc("nvim_input", ["w"])
    t1 = nvim.wait_visible(True)
    if i in (0, args.cycles - 1):
        # Labels of hints placed in the current window; the grid must show them.
        labels = nvim.lua("""local w = vim.api.nvim_get_current_win(); local out = {}
          for _, t in ipairs(require('hellshake_yano.core').get_state().targets) do
            if t.winid == w then out[#out + 1] = t.hint end end; return out""")
        screens["first" if i == 0 else "last"] = (nvim.screen(), labels)
    # Prefix key re-renders every label (multi-char hints start with B in both profiles).
    p0 = time.monotonic()
    nvim.rpc("nvim_input", ["B"])
    prefix_ms = None
    while time.monotonic() - p0 < 3:
        if nvim.lua("return require('hellshake_yano.core').get_state().prefix") == "B":
            prefix_ms = (time.monotonic() - p0) * 1000
            break
        time.sleep(0.002)
    if prefix_ms is None:
        raise TimeoutError("prefix B was not applied")
    nvim.rpc("nvim_input", ["<Esc>"])
    nvim.wait_visible(False)
    return {"e2e_ms": (t1 - t0) * 1000, "prefix_ms": prefix_ms, **nvim.lua(SNAPSHOT_LUA)}


def judge(result, args):
    failures = []
    if "doctor" in result:
        return [f"doctor: {p}" for p in result["doctor"]]
    if result["stuck"]:
        failures.append("stuck: " + result["stuck"])
    if not result["cycles"]:
        return failures
    cycles, base = result["cycles"], result["baseline"]
    window = max(1, len(cycles) // 5)
    for key, budget in (("e2e_ms", args.e2e_budget), ("engine_ms", args.engine_budget),
                        ("prefix_ms", args.e2e_budget)):
        values = [c[key] for c in cycles]
        head, tail = median(values[:window]), median(values[-window:])
        result[f"{key}_p95"], result[f"{key}_head"], result[f"{key}_tail"] = p95(values), head, tail
        if p95(values) > budget:
            failures.append(f"{key} p95 {p95(values):.1f}ms > budget {budget}ms")
        # Degradation: last 20% vs first 20%, ignoring sub-noise absolute drift.
        if tail > head * args.max_ratio and tail - head > args.noise_ms:
            failures.append(f"{key} degraded: head {head:.1f}ms -> tail {tail:.1f}ms")
    # Hidden pooled floats legitimately persist after the first display (and other
    # plugins may open a window once), so a leak is growth past the warm-up peak,
    # or anything still shown/marked after hide.
    first = {key: max(c[key] for c in cycles[:window]) for key in ("wins", "bufs")}
    for i, c in enumerate(cycles):
        for key, ref in (("wins", first), ("bufs", first), ("shown_wins", base), ("extmarks", base)):
            # Only growth is a leak; other plugins' transient floats may close meanwhile.
            if c[key] > ref[key]:
                failures.append(f"cycle {i}: {key} {ref[key]} -> {c[key]} after hide (leak)")
                break
        if c["visible"]:
            failures.append(f"cycle {i}: hints still visible after <Esc>")
    growth = cycles[-1]["lua_kb"] - base["lua_kb"]
    result["lua_kb_growth"] = growth
    if growth > args.max_lua_kb:
        failures.append(f"Lua heap grew {growth:.0f}KB over {len(cycles)} cycles")
    if not result["hint_on_screen"]:
        failures.append("hint labels not rendered on the attached UI grid")
    if result["errmsg"]:
        failures.append(f"v:errmsg = {result['errmsg']}")
    return failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cycles", type=int, default=100)
    parser.add_argument("--profile", choices=[*PROFILES, "all"], default="all")
    parser.add_argument("--out", default=os.path.join(EVIDENCE_ROOT, time.strftime("%Y%m%d-%H%M%S")))
    parser.add_argument("--full-init", action="store_true",
                        help="init profile loads the whole init.vim + plugins instead of -u NONE")
    parser.add_argument("--key-gap", type=float, default=0.08)
    parser.add_argument("--e2e-budget", type=float, default=100.0, help="p95 ms, key press -> visible")
    parser.add_argument("--engine-budget", type=float, default=50.0, help="p95 ms, detect+show")
    parser.add_argument("--max-ratio", type=float, default=1.5)
    parser.add_argument("--noise-ms", type=float, default=3.0)
    parser.add_argument("--max-lua-kb", type=float, default=2048.0)
    args = parser.parse_args()
    os.makedirs(args.out, exist_ok=True)
    profiles = list(PROFILES) if args.profile == "all" else [args.profile]
    exit_code, report = 0, []
    for name in profiles:
        result = run_profile(name, args, args.out)
        failures = judge(result, args)
        result["failures"] = failures
        report.append(result)
        if "doctor" in result:
            exit_code = max(exit_code, 2)
            line = f"[{name}] DOCTOR FAIL: " + "; ".join(failures)
        elif "e2e_ms_p95" not in result:
            exit_code = 1
            line = f"[{name}] FAIL cycles=0"
        else:
            exit_code = max(exit_code, 1 if failures else 0)
            line = (f"[{name}] {'FAIL' if failures else 'PASS'} cycles={len(result['cycles'])} "
                    f"e2e p95={result['e2e_ms_p95']:.1f}ms head/tail={result['e2e_ms_head']:.1f}/"
                    f"{result['e2e_ms_tail']:.1f}ms engine p95={result['engine_ms_p95']:.1f}ms "
                    f"head/tail={result['engine_ms_head']:.1f}/{result['engine_ms_tail']:.1f}ms "
                    f"prefix p95={result['prefix_ms_p95']:.1f}ms head/tail={result['prefix_ms_head']:.1f}/"
                    f"{result['prefix_ms_tail']:.1f}ms "
                    f"lua+{result['lua_kb_growth']:.0f}KB")
        print(line)
        for failure in failures[:10]:
            print("  - " + failure)
    with open(os.path.join(args.out, "metrics.json"), "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print("evidence:", args.out)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
