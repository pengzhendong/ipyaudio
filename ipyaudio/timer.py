#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

import logging
import time

logging.basicConfig(level=logging.INFO)


class Timer:
    def __init__(self, name=None, auto_start=True, language="en", verbose=False):
        self.name = name
        self.language = language
        self.verbose = verbose
        self.start_time = None
        self.end_time = None
        self.cost_label = "Cost time" if self.language == "en" else "耗时"
        self.unit = "s" if self.language == "en" else "秒"
        self.error_label = "Timer not started" if self.language == "en" else "计时器尚未开始"
        if auto_start:
            self.start()

    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.perf_counter()
        elapsed = self.end_time - self.start_time
        if self.name:
            logging.info(f"[{self.name}] {self.cost_label}: {elapsed:.6f} {self.unit}")
        else:
            logging.info(f"{self.cost_label}: {elapsed:.6f} {self.unit}")

    def __str__(self):
        return (
            f"[{self.name}] {self.cost_label}: {self.elapsed():.6f} {self.unit}"
            if self.name
            else f"{self.cost_label}: {self.elapsed():.6f} {self.unit}"
        )

    def start(self):
        self.start_time = time.perf_counter()
        self.end_time = None

    def elapsed(self):
        if self.start_time is None:
            raise RuntimeError(self.error_label)
        end_time = self.end_time or time.perf_counter()
        elapsed = end_time - self.start_time

        if self.verbose:
            logging.info(self.str())
        return elapsed
