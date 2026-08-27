# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

import time
from collections.abc import Callable


class Timer:
    """A small monotonic timer with injectable time for deterministic tests."""

    def __init__(
        self,
        name: str | None = None,
        auto_start: bool = True,
        language: str = "en",
        clock: Callable[[], float] = time.perf_counter,
    ):
        self.name = name
        self.language = language.lower()
        self._clock = clock
        self.start_time: float | None = None
        self.end_time: float | None = None
        self.cost_label = "Cost time" if self.language == "en" else "耗时"
        self.unit = "s" if self.language == "en" else "秒"
        self.error_label = (
            "Timer not started" if self.language == "en" else "计时器尚未开始"
        )
        if auto_start:
            self.start()

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()

    def __str__(self):
        return (
            f"[{self.name}] {self.cost_label}: {self.elapsed():.6f} {self.unit}"
            if self.name
            else f"{self.cost_label}: {self.elapsed():.6f} {self.unit}"
        )

    def start(self):
        self.start_time = self._clock()
        self.end_time = None
        return self

    def stop(self) -> float:
        if self.start_time is None:
            raise RuntimeError(self.error_label)
        self.end_time = self._clock()
        return self.elapsed()

    def elapsed(self):
        if self.start_time is None:
            raise RuntimeError(self.error_label)
        end_time = self.end_time if self.end_time is not None else self._clock()
        return end_time - self.start_time
