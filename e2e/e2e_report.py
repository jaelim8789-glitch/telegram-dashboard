"""
E2E Test Report Generator -- produces structured JSON and human-readable reports.

Tracks test results, timing, failures, and generates a comprehensive report
that can be consumed by CI/CD pipelines.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class TestResult:
    name: str
    category: str
    status: str  # "PASS" | "FAIL" | "SKIP" | "ERROR"
    duration_seconds: float = 0.0
    error_message: str = ""
    error_detail: str = ""
    timestamp: str = ""


@dataclass
class TestSuiteResult:
    name: str
    results: list[TestResult] = field(default_factory=list)
    start_time: float = 0.0
    end_time: float = 0.0

    @property
    def passed(self) -> int:
        return sum(1 for r in self.results if r.status == "PASS")

    @property
    def failed(self) -> int:
        return sum(1 for r in self.results if r.status in ("FAIL", "ERROR"))

    @property
    def skipped(self) -> int:
        return sum(1 for r in self.results if r.status == "SKIP")

    @property
    def total(self) -> int:
        return len(self.results)

    @property
    def duration(self) -> float:
        return self.end_time - self.start_time if self.end_time > self.start_time else 0.0

    @property
    def success_rate(self) -> float:
        if self.total == 0:
            return 0.0
        return (self.passed / self.total) * 100.0


class TestReport:
    """Collects test results across multiple suites and generates reports."""

    def __init__(self) -> None:
        self.suites: list[TestSuiteResult] = []
        self._current_suite: TestSuiteResult | None = None
        self._global_start: float = time.time()

    def start_suite(self, name: str) -> None:
        """Begin a new test suite."""
        self._current_suite = TestSuiteResult(name=name, start_time=time.time())
        self.suites.append(self._current_suite)

    def end_suite(self) -> None:
        """Finish the current test suite."""
        if self._current_suite:
            self._current_suite.end_time = time.time()

    def add_result(
        self,
        name: str,
        category: str,
        status: str,
        duration: float = 0.0,
        error_message: str = "",
        error_detail: str = "",
    ) -> None:
        """Record a single test result."""
        result = TestResult(
            name=name,
            category=category,
            status=status,
            duration_seconds=duration,
            error_message=error_message,
            error_detail=error_detail,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        if self._current_suite:
            self._current_suite.results.append(result)

    def pass_test(self, name: str, category: str, duration: float = 0.0) -> None:
        self.add_result(name, category, "PASS", duration=duration)

    def fail_test(self, name: str, category: str, duration: float = 0.0, error: str = "", detail: str = "") -> None:
        self.add_result(name, category, "FAIL", duration=duration, error_message=error, error_detail=detail)

    def skip_test(self, name: str, category: str, reason: str = "") -> None:
        self.add_result(name, category, "SKIP", error_message=reason)

    # -- Aggregation ---------------------------------------------------

    @property
    def total_passed(self) -> int:
        return sum(s.passed for s in self.suites)

    @property
    def total_failed(self) -> int:
        return sum(s.failed for s in self.suites)

    @property
    def total_skipped(self) -> int:
        return sum(s.skipped for s in self.suites)

    @property
    def total_tests(self) -> int:
        return sum(s.total for s in self.suites)

    @property
    def total_duration(self) -> float:
        return time.time() - self._global_start

    @property
    def overall_success_rate(self) -> float:
        if self.total_tests == 0:
            return 0.0
        return (self.total_passed / self.total_tests) * 100.0

    # -- Report Generation ---------------------------------------------

    def to_dict(self) -> dict[str, Any]:
        """Serialize the report to a dictionary."""
        return {
            "report_metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "total_duration_seconds": round(self.total_duration, 2),
            },
            "summary": {
                "total_tests": self.total_tests,
                "passed": self.total_passed,
                "failed": self.total_failed,
                "skipped": self.total_skipped,
                "success_rate": round(self.overall_success_rate, 1),
            },
            "suites": [
                {
                    "name": s.name,
                    "duration_seconds": round(s.duration, 2),
                    "summary": {
                        "total": s.total,
                        "passed": s.passed,
                        "failed": s.failed,
                        "skipped": s.skipped,
                        "success_rate": round(s.success_rate, 1),
                    },
                    "results": [
                        {
                            "name": r.name,
                            "category": r.category,
                            "status": r.status,
                            "duration_seconds": round(r.duration_seconds, 3),
                            "error_message": r.error_message,
                            "error_detail": r.error_detail,
                            "timestamp": r.timestamp,
                        }
                        for r in s.results
                    ],
                }
                for s in self.suites
            ],
        }

    def save_json(self, path: str | None = None) -> str:
        """Save the report as JSON and return the path."""
        output_path = path or "e2e/report.json"
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
        return output_path

    def print_summary(self) -> None:
        """Print a human-readable summary to stdout."""
        print()
        print("=" * 70)
        print("  TeleMon E2E Test Report")
        print("=" * 70)
        print(f"  Total Duration: {self.total_duration:.2f}s")
        print(f"  Total Tests:    {self.total_tests}")
        print(f"  Passed:         {self.total_passed}")
        print(f"  Failed:         {self.total_failed}")
        print(f"  Skipped:        {self.total_skipped}")
        print(f"  Success Rate:   {self.overall_success_rate:.1f}%")
        print()

        for suite in self.suites:
            status_icon = "[OK]" if suite.failed == 0 else "[FAIL]"
            print(f"  {status_icon} {suite.name} ({suite.duration:.2f}s)")
            print(f"      {suite.passed}/{suite.total} passed, {suite.failed} failed, {suite.skipped} skipped")

            for r in suite.results:
                if r.status == "FAIL":
                    print(f"      +-> FAIL: {r.name} ({r.duration_seconds:.2f}s)")
                    if r.error_message:
                        print(f"           Error: {r.error_message}")
                elif r.status == "ERROR":
                    print(f"      +-> ERROR: {r.name} ({r.duration_seconds:.2f}s)")
                    if r.error_message:
                        print(f"           Error: {r.error_message}")
                elif r.status == "SKIP":
                    print(f"      +-> SKIP: {r.name} -- {r.error_message}")

        print()
        if self.total_failed == 0:
            print("  [PASS] ALL TESTS PASSED")
        else:
            print(f"  [FAIL] {self.total_failed} TEST(S) FAILED")
        print("=" * 70)
        print()


# Global report instance
REPORT = TestReport()