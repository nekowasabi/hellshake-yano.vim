#!/usr/bin/env python3
"""Regression checks for known-failure gating without spawning an editor."""

import contextlib
import importlib.util
import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "gate", Path(__file__).with_name("vim-test-gate.py")
)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class GateTests(unittest.TestCase):
    def run_gate(self, log, code=1, editor="vim", selector="both"):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "log").write_text(log)
            (root / "records").write_text(f"tests-vim/example.vim\t{code}\t{root / 'log'}\n")
            (root / "known").write_text(
                f"{selector}\ttests-vim/example.vim\told failure # baseline\n"
            )
            output = io.StringIO()
            args = ["gate", editor, str(root / "records"), str(root / "known")]
            with patch.object(sys, "argv", args), contextlib.redirect_stdout(output):
                code = gate.main()
            return code, output.getvalue()

    def test_known_and_new_in_same_file(self):
        self.assertEqual(self.run_gate("FAIL: old failure\n")[0], 0)
        self.assertEqual(self.run_gate("FAIL: old failure\nFAIL: new failure\n")[0], 1)
        self.assertEqual(self.run_gate("FAIL: old failure\nFAILED: new failure\n")[0], 1)
        self.assertEqual(self.run_gate(
            "HY_TEST_FAIL old failure\n✗ extra failure\n"
        )[0], 1)
        self.assertEqual(self.run_gate(
            "HY_TEST_FAIL old failure\nEXCEPTION: extra failure\n"
        )[0], 1)

    def test_editor_specific(self):
        self.assertEqual(self.run_gate("FAIL: old failure\n", selector="vim-only")[0], 0)
        self.assertEqual(self.run_gate("FAIL: old failure\n", editor="nvim",
                                       selector="vim-only")[0], 1)

    def test_notice_requires_success(self):
        code, output = self.run_gate("PASS: old failure\n", code=0)
        self.assertEqual(code, 0)
        self.assertIn("NOTICE: known failure now passes", output)
        self.assertNotIn("NOTICE:", self.run_gate("FAIL: old failure\n")[1])

    def test_crash_timeout_and_empty_output(self):
        for code in (124, 139):
            self.assertEqual(self.run_gate("FAIL: old failure\n", code=code)[0], 1)
        self.assertEqual(self.run_gate('"tests-vim/example.vim" 10L\n', code=0)[0], 1)

    def test_legacy_zero_exit_failure(self):
        self.assertEqual(self.run_gate("FAIL: new failure\n", code=0)[0], 1)
        self.assertEqual(self.run_gate("SOME TESTS FAILED!\n", code=0)[0], 1)

    def test_machine_records_and_native_assertions(self):
        failed, passed = gate.results(
            "HY_TEST_FAIL Test_bad\nHY_TEST_PASS Test_good\n"
            "HY_ASSERT_FAIL command line..function <SNR>2_test_native line 4: Expected 1\n"
        )
        self.assertEqual(failed, {"Test_bad", "s:test_native"})
        self.assertEqual(passed, {"Test_good"})


if __name__ == "__main__":
    unittest.main()
