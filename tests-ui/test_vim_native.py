#!/usr/bin/env python3
"""Run native Vim9 screen assertions in a real 100x30 terminal (stdlib only)."""
import fcntl
import os
from pathlib import Path
import pty
import select
import struct
import sys
import subprocess
import tempfile
import termios
import time

root = Path(__file__).resolve().parents[1]
binary = os.environ.get("VIM_BIN", "vim")
with tempfile.TemporaryDirectory(prefix="hy-vim9-ui-") as directory:
    result = Path(directory) / "result.txt"
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 30, 100, 0, 0))
    env = dict(os.environ, TERM="xterm-256color", HY_VIM9_UI_RESULT=str(result))
    process = subprocess.Popen(
        [binary, "-N", "-u", "NONE", "-i", "NONE", "-n", "--cmd",
         f"set rtp^={root}", "-S", sys.argv[1] if len(sys.argv) > 1 else "tests-vim9/ui.vim"],
        cwd=root, env=env, stdin=slave, stdout=slave, stderr=slave,
    )
    os.close(slave)
    output = bytearray()
    try:
        deadline = time.monotonic() + 20
        while process.poll() is None and time.monotonic() < deadline:
            if select.select([master], [], [], 0.1)[0]:
                try:
                    output.extend(os.read(master, 65536))
                except OSError:
                    break
        if process.poll() is None:
            process.kill()
        code = process.wait(timeout=5)
    finally:
        os.close(master)
        if process.poll() is None:
            process.kill()
            process.wait()
    evidence = result.read_text() if result.exists() else output.decode(errors="replace")
    print(evidence.strip())
    assert code == 0 and evidence.startswith("PASS "), f"Vim UI failed (exit {code})"
