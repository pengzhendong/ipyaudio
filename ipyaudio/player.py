#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

import asyncio
import json
from importlib.resources import files
from pathlib import Path
from types import AsyncGeneratorType, GeneratorType
from typing import Optional, Union

import numpy as np
import torch
from audiolab import encode
from IPython.display import display
from ipywidgets import HTML, DOMWidget, ValueWidget, VBox, register
from lhotse import Recording
from lhotse.cut.base import Cut
from traitlets import Bool, Dict, Int, Unicode

from ._frontend import module_name, module_version
from .timer import Timer
from .utils import merge_dicts, table


@register
class Player(DOMWidget, ValueWidget):
    _model_name = Unicode("PlayerModel").tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode("PlayerView").tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    config = Dict({}).tag(sync=True)
    language = Unicode("en").tag(sync=True)
    verbose = Bool(False).tag(sync=True)

    audio = Unicode("").tag(sync=True)
    rate = Int(16000).tag(sync=True)
    is_streaming = Bool(False).tag(sync=True)
    is_done = Bool(False).tag(sync=True)

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
        config_path = files("ipyaudio.configs").joinpath("player.json")
        self.config = merge_dicts(json.loads(config_path.read_text(encoding="utf-8")), config)
        self.language = language.lower()
        self.verbose = verbose

        self._audio = audio
        if rate is not None:
            self.rate = rate
        self.is_streaming = isinstance(audio, (AsyncGeneratorType, GeneratorType))
        if self.is_streaming and self.verbose:
            self.duration = 0
            self.html = HTML()
            self.performance = {
                "latency": ["延迟" if self.language == "zh" else "Latency", "0ms"],
                "rtf": ["实时率" if self.language == "zh" else "Real-Time Factor", "0.00"],
            }
            self.html.value = table(self.performance)
            display(VBox([self, self.html]))
        else:
            display(self)

    def encode_chunk(self, idx, chunk, rate, timer: Timer):
        if self.is_streaming and self.verbose:
            if idx == 0:
                self.performance["latency"][1] = f"{int(timer.elapsed() * 1000)}ms"
            self.duration += chunk.shape[1] / rate
            if self.duration > 0:
                self.performance["rtf"][1] = round(timer.elapsed() / self.duration, 2)
            self.html.value = table(self.performance)
        self.audio, self.rate = encode(chunk, rate, make_wav=False)

    async def async_encode(self, audio: AsyncGeneratorType, rate: int, timer: Timer):
        async for idx, chunk in enumerate(audio):
            self.encode_chunk(idx, chunk, rate, timer)

    def play(self):
        timer = Timer(language=self.language)
        if isinstance(self._audio, (str, Path, np.ndarray, torch.Tensor, Cut, Recording)):
            # [num_channels, num_samples]
            self.audio, self.rate = encode(self._audio, self.rate)
        elif isinstance(self._audio, AsyncGeneratorType):
            asyncio.create_task(self.async_encode(self._audio, self.rate, timer))
            self.is_done = True
        else:
            for idx, chunk in enumerate(self._audio):
                self.encode_chunk(idx, chunk, self.rate, timer)
            self.is_done = True
