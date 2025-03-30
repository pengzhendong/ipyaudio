#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

import asyncio
import json
import os
import time
from pathlib import Path
from types import AsyncGeneratorType, GeneratorType
from typing import Optional, Union

import numpy as np
import torch
from IPython.display import display
from ipywidgets import DOMWidget, Label, ValueWidget, VBox, register
from lhotse import Recording
from lhotse.cut.base import Cut
from traitlets import Bool, Dict, Float, Int, Unicode

from ._frontend import module_name, module_version
from .utils import encode, merge_dicts

DIRNAME = os.path.dirname(__file__)


@register
class Player(DOMWidget, ValueWidget):
    _model_name = Unicode("PlayerModel").tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode("PlayerView").tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    config = Dict(json.load(open(os.path.join(DIRNAME, "../player.json")))).tag(sync=True)
    audio = Unicode("").tag(sync=True)
    rate = Int(16000).tag(sync=True)
    is_streaming = Bool(False).tag(sync=True)
    is_done = Bool(False).tag(sync=True)
    language = Unicode("en").tag(sync=True)
    latency = Int(0).tag(sync=True)
    rtf = Float(0).tag(sync=True)
    verbose = Bool(False).tag(sync=True)

    def __init__(
        self,
        audio: Union[str, Path, np.ndarray, torch.Tensor, Cut, Recording, AsyncGeneratorType, GeneratorType],
        rate: Optional[int] = None,
        config: dict = {},
        language: str = "en",
        verbose: bool = False,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self._audio = audio
        if rate is not None:
            self.rate = rate
        self.config = merge_dicts(self.config, config)
        self.is_streaming = isinstance(audio, (AsyncGeneratorType, GeneratorType))
        self.language = language.lower()
        self.verbose = verbose
        if self.is_streaming and self.verbose:
            self.duration = 0
            self.latency_label = Label()
            self.rtf_label = Label()
            self.observe(self._on_latency_change, names="latency")
            self.observe(self._on_rtf_change, names="rtf")
            display(VBox([self, self.latency_label, self.rtf_label]))
        else:
            display(self)

    def _on_latency_change(self, change):
        label = "延迟" if self.language == "zh" else "Latency"
        self.latency_label.value = f"{label}: {self.latency} ms"

    def _on_rtf_change(self, change):
        label = "实时率" if self.language == "zh" else "Real-Time Factor"
        self.rtf_label.value = f"{label}: {self.rtf:.2f}"

    def encode_chunk(self, start, idx, chunk, rate):
        if self.is_streaming and self.verbose:
            if idx == 0:
                self.latency = int((time.time() - start) * 1000)
            self.duration += chunk.shape[1] / rate
            self.rtf = (time.time() - start) / self.duration
        self.audio, self.rate = encode(chunk, rate, False)

    async def async_encode(self, audio: AsyncGeneratorType, rate: int, start: float):
        async for idx, chunk in enumerate(audio):
            self.encode_chunk(start, idx, chunk, rate)

    def play(self):
        start = time.time()
        if isinstance(self._audio, (str, Path, np.ndarray, torch.Tensor, Cut, Recording)):
            # [num_channels, num_samples]
            self.audio, self.rate = encode(self._audio, self.rate)
        elif isinstance(self._audio, AsyncGeneratorType):
            asyncio.create_task(self.async_encode(self._audio, self.rate, start))
            self.is_done = True
        else:
            for idx, chunk in enumerate(self._audio):
                self.encode_chunk(start, idx, chunk, self.rate)
            self.is_done = True
