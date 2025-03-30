#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

import json
import os
from functools import partial

import numpy as np
from audiolab import StreamReader, filters, Writer
from ipydatawidgets import NDArray, array_serialization, shape_constraints
from IPython.display import display
from ipywidgets import DOMWidget, ValueWidget, register
from traitlets import Bool, Dict, Int, Unicode

from ._frontend import module_name, module_version
from .utils import merge_dicts

DIRNAME = os.path.dirname(__file__)


@register
class Recorder(DOMWidget, ValueWidget):
    _model_name = Unicode("RecorderModel").tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode("RecorderView").tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    config = Dict(json.load(open(os.path.join(DIRNAME, "../recorder.json")))).tag(sync=True)
    player_config = Dict(json.load(open(os.path.join(DIRNAME, "../player.json")))).tag(sync=True)
    language = Unicode("en").tag(sync=True)

    chunk = NDArray(dtype=np.uint8, default_value=np.zeros((0,), dtype=np.uint8))
    chunk = chunk.tag(sync=True, **array_serialization).valid(shape_constraints(None,))
    frame = NDArray(dtype=np.float32, default_value=np.zeros((1, 0), dtype=np.float32))
    frame = frame.tag(sync=True, **array_serialization).valid(shape_constraints(None, None))
    rate = Int(16000).tag(sync=True)
    end = Bool(True).tag(sync=True)

    def __init__(
        self,
        filename: str = None,
        config: dict = {},
        player_config: dict = {},
        language: str = "en",
        verbose: bool = False,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.audio = np.zeros((1, 0), dtype=np.float32)
        self.aformat = partial(filters.aformat, sample_fmts="flt", channel_layouts=1)
        self.stream_reader = StreamReader(filters=[self.aformat(sample_rates=self.rate)], frame_size=1024)
        self.writer = None
        if filename is not None:
            self.writer = Writer(filename, codec_name="pcm_f32le", format="flt", layout="mono", rate=self.rate)

        self.config = merge_dicts(self.config, config)
        self.player_config = merge_dicts(self.player_config, player_config)
        self.language = language.lower()
        self.verbose = verbose
        self.observe(self._on_chunk_change, names="chunk")
        self.observe(self._on_end_change, names="end")
        self.observe(self._on_rate_change, names="rate")
        display(self)

    def _on_chunk_change(self, change):
        # 48000 Hz, WebM, mono
        self.stream_reader.push(change["new"].tobytes())
        for frame, _ in self.stream_reader.pull():
            self.audio = np.concatenate((self.audio, frame), axis=1)
            self.frame = frame

    def _on_end_change(self, change):
        if change["new"]:
            for frame, _ in self.stream_reader.pull(partial=True):
                self.audio = np.concatenate((self.audio, frame), axis=1)
                self.frame = frame
            if self.writer is not None:
                self.writer.write(self.audio)
                self.writer.close()
        else:
            # Reset before recording
            self.audio = np.zeros((1, 0), dtype=np.float32)
            self.stream_reader.reset()

    def _on_rate_change(self, change):
        self.stream_reader.filters = [self.aformat(sample_rates=self.rate)]
