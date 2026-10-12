#!/usr/bin/env python3
"""Neovim UI integration tests. Requires Python msgpack and NVIM_BIN (or nvim)."""
import os
import select
import subprocess
import time

import msgpack


class Neovim:
    def __init__(self):
        self.process = subprocess.Popen(
            [os.environ.get("NVIM_BIN", "nvim"), "--embed", "--headless", "-u", "NONE", "-i", "NONE", "-n"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env={**os.environ, "NVIM_LOG_FILE": "/tmp/hellshake-yano-ui.log"},
        )
        self.unpacker = msgpack.Unpacker(raw=False, ext_hook=lambda code, data: msgpack.unpackb(data))
        self.sequence = 0
        self.grid = []

    def redraw(self, events):
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

    def rpc(self, method, args=None):
        self.sequence += 1
        self.process.stdin.write(msgpack.packb([0, self.sequence, method, args or []]))
        self.process.stdin.flush()
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            for message in self.unpacker:
                if message[0] == 1 and message[1] == self.sequence:
                    if message[2]:
                        raise RuntimeError(message[2])
                    return message[3]
                if message[0] == 2 and message[1] == "redraw":
                    self.redraw(message[2])
            if select.select([self.process.stdout], [], [], max(0, deadline - time.monotonic()))[0]:
                chunk = os.read(self.process.stdout.fileno(), 65536)
                if not chunk:
                    raise RuntimeError("Neovim closed its RPC connection")
                self.unpacker.feed(chunk)
        raise TimeoutError(method)

    def lua(self, code):
        return self.rpc("nvim_exec_lua", [code, []])

    def screen(self):
        self.rpc("nvim_command", ["redraw"])
        self.rpc("nvim_eval", ["1"])  # Drain redraw notifications before inspecting cells.
        return "\n".join("".join(row) for row in self.grid)

    def close(self):
        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=5)


nvim = Neovim()
try:
    nvim.rpc("nvim_ui_attach", [60, 20, {"rgb": True, "ext_linegrid": True}])
    nvim.lua("""
      vim.opt.rtp:prepend(vim.fn.getcwd())
      vim.api.nvim_buf_set_lines(0,0,-1,false,{('alpha beta gamma delta '):rep(10)})
      vim.wo.wrap=false
      vim.cmd('normal! 30zl')
      vim.cmd('redraw')
    """)
    found = nvim.lua("return require('hellshake_yano.words').detect(require('hellshake_yano.config').resolve(), '')")
    assert found and all(31 <= word["col"] <= 90 for word in found), "off-screen words received hints"

    nvim.lua("""
      vim.api.nvim_buf_set_lines(0,0,-1,false,{'日本語 alpha beta'})
      vim.api.nvim_win_set_cursor(0,{1,0})
      vim.cmd('normal! ze')
      vim.fn.winrestview({leftcol=0})
      vim.cmd('redraw')
      local core=require('hellshake_yano.core')
      core.setup({singleCharKeys='/',multiCharKeys='BC'})
      core.show(require('hellshake_yano.words').detect(core.get_config(),''))
    """)
    screen = nvim.screen()
    assert "/lpha" in screen and "BBta" in screen, screen
    nvim.lua("require('hellshake_yano.core').hide()")
    assert "日本語 alpha beta" in nvim.screen(), "hide did not restore the display"

    nvim.lua("""
      vim.cmd('vsplit')
      local core=require('hellshake_yano.core')
      core.setup({multiWindowMode=true,singleCharKeys='AB',multiCharKeys='CD'})
      vim.cmd('redraw')
      core.show(require('hellshake_yano.words').detect(core.get_config(),''))
    """)
    screen = nvim.screen()
    assert "Alpha" in screen and "CCpha" in screen, screen  # Current-window words receive earlier labels.
    nvim.lua("require('hellshake_yano.core').hide()")
    # Hint floats are pooled and hidden for reuse; none may stay shown.
    assert nvim.lua("return #vim.tbl_filter(function(w) return not vim.api.nvim_win_get_config(w).hide end,"
                    " vim.api.nvim_list_wins())") == 2, "hint windows left visible"
    # Exercise real redraw after repeated prefix cancellation, not only API counts.
    baseline = nvim.lua("return {#vim.api.nvim_list_wins(), #vim.api.nvim_list_bufs()}")
    for _ in range(10):
        nvim.lua("""
          local core=require('hellshake_yano.core')
          core.setup({multiWindowMode=true,singleCharKeys='/',multiCharKeys='BC'})
          core.show(require('hellshake_yano.words').detect(core.get_config(),''))
          core.input('B')
        """)
        nvim.screen()
        assert nvim.lua("return require('hellshake_yano.core').input(string.char(27))") == "cancelled"
        assert "alpha beta" in nvim.screen(), "cancel did not restore source text"
        assert nvim.lua("return {#vim.api.nvim_list_wins(), #vim.api.nvim_list_bufs()}") == baseline
    assert nvim.lua("return vim.v.errmsg") == ""
    print("PASS: attached UI horizontal viewport, Japanese byte positions, visible labels, same-buffer splits, cleanup")
finally:
    nvim.close()
