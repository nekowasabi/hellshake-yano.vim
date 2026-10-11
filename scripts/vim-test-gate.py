#!/usr/bin/env python3
"""Match individual Vim test failures, never entire failing files."""

import re
import sys
from pathlib import Path


FAILURE_RE = re.compile(
    r"^\s*✗|^\s*FAIL:|\[FAIL\]|FAIL \[Test|^\s*FAILED:|"
    r"RESULT: FAILURE|Some tests failed|SOME TESTS FAILED|EXCEPTION:|"
    r"AssertionError:|Assertion failed|^E\d+:|HY_TEST_FAIL",
    re.MULTILINE,
)


def results(log):
    failed, passed = set(), set()
    current = ""
    for line in log.splitlines():
        line = line.strip().replace("^I", "\t")
        match = re.fullmatch(r"(Test_\w+)", line)
        if match:
            current = match[1]
        match = re.match(r"HY_TEST_(FAIL|PASS)\s+(.+)", line)
        if match:
            (failed if match[1] == "FAIL" else passed).add(match[2])
            current = ""
            continue
        match = re.match(r"HY_ASSERT_FAIL\s+(.+)", line)
        if match:
            functions = re.findall(r"<SNR>\d+_(\w+)", match[1])
            name = "s:" + functions[-1] if functions else re.sub(
                r"^.* line \d+: ", "assert: ", match[1]
            )
            failed.add(name)
            continue
        if line.startswith("✗"):
            failed.add(current or line[1:].strip())
            continue
        match = re.match(r"(?:\[(FAIL|PASS)\]|(FAIL|PASS|FAILED):)\s*(.+)", line)
        if match:
            status = match[1] or match[2]
            name = re.sub(r": Vim\(.*", "", match[3])
            if status == "FAILED" and name.isdigit():
                continue
            (passed if status == "PASS" else failed).add(name)
            continue
        match = re.match(r"ERROR in (\w+)\s*:", line)
        if match:
            failed.add(match[1])
            continue
        if re.match(r"^E\d+:", line):
            failed.add("script error: " + re.sub(r"<SNR>\d+_", "<SNR>_", line))
        elif line.startswith("FAIL [Test"):
            failed.add(line)
        elif line.startswith("EXCEPTION:"):
            failed.add(current or line)
    return failed, passed


def main():
    editor, records_path, known_path = sys.argv[1:]
    known = set()
    for line in Path(known_path).read_text().splitlines():
        line = line.split(" #", 1)[0].strip()
        if not line or line.startswith("#"):
            continue
        selector, file, test = line.split("\t", 2)
        if selector in ("both", editor + "-only"):
            known.add((file, test))

    unexpected, observed_passes, observed_failures = set(), set(), set()
    counts = {"PASS": 0, "KNOWN": 0, "FAIL": 0, "SKIP": 0}
    for record in Path(records_path).read_text().splitlines():
        file, code, log_path = record.split("\t")
        if code == "skip":
            counts["SKIP"] += 1
            continue
        code = int(code)
        log = Path(log_path).read_text(errors="replace")
        failures, passes = results(log)
        observed_passes.update((file, test) for test in passes)
        # Exit codes are primary. Legacy tests that quit early may still need logs.
        if code == 124 or code not in (0, 1):
            failures.add(f"exit {code}")
        elif not failures and (code or FAILURE_RE.search(log)):
            failures.add(f"exit {code}" if code else "unidentified failure output")
        if not any(line.strip() and not line.startswith('"tests-vim/')
                   for line in log.splitlines()):
            failures.add("no test output")

        # A clean complete file also proves that its former script errors are gone.
        if code == 0 and not failures:
            observed_passes.update(entry for entry in known if entry[0] == file)

        observed_failures.update((file, test) for test in failures)
        new = {(file, test) for test in failures} - known
        unexpected.update(new)
        status = "FAIL" if new else "KNOWN" if failures else "PASS"
        counts[status] += 1
        print(f"[{status}] {file}")
        for _, test in sorted(new):
            print(f"    {test}")

    # Absence alone is not success: a runtime error may have prevented execution.
    for file, test in sorted(known & observed_passes):
        if (file, test) not in observed_failures:
            print(f"NOTICE: known failure now passes: {file} :: {test}")
    print(
        f"{editor}: PASS {counts['PASS']}  KNOWN {counts['KNOWN']}  "
        f"FAIL {counts['FAIL']}  SKIP {counts['SKIP']}"
    )
    return int(bool(unexpected))


if __name__ == "__main__":
    sys.exit(main())
