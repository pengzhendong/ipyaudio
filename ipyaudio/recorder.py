#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

import json
from functools import partial
from importlib.resources import files
from time import time

import numpy as np
from audiolab import StreamReader, Writer, filters
from ipydatawidgets import NDArray, array_serialization, shape_constraints
from IPython.display import display
from ipywidgets import DOMWidget, Label, ValueWidget, VBox, register
from traitlets import Bool, Dict, Int, Unicode

from ._frontend import module_name, module_version
from .utils import merge_dicts


@register
class Recorder(DOMWidget, ValueWidget):
    _model_name = Unicode("RecorderModel").tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode("RecorderView").tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    config = Dict({}).tag(sync=True)
    player_config = Dict({}).tag(sync=True)
    sync = Bool(False).tag(sync=True)
    language = Unicode("en").tag(sync=True)
    verbose = Bool(False).tag(sync=True)

    # 48000 Hz, WebM, mono
    chunk = (
        NDArray(dtype=np.uint8, default_value=np.zeros((0,), dtype=np.uint8))
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None))
    )
    frame = (
        NDArray(dtype=np.float32, default_value=np.zeros((1, 0), dtype=np.float32))
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None, None))
    )
    rate = Int(16000).tag(sync=True)
    completed = Bool(True).tag(sync=True)

    def __init__(
        self,
        filename: str = None,
        config: dict = {},
        player_config: dict = {},
        sync: bool = False,
        language: str = "en",
        verbose: bool = False,
        **kwargs,
    ):
        super().__init__(**kwargs)
        config_path = files("ipyaudio.configs").joinpath("recorder.json")
        player_config_path = files("ipyaudio.configs").joinpath("player.json")
        self.config = merge_dicts(json.loads(config_path.read_text(encoding="utf-8")), config)
        self.player_config = merge_dicts(json.loads(player_config_path.read_text(encoding="utf-8")), player_config)
        self.sync = sync
        self.language = language.lower()
        self.verbose = verbose
        self.start = time()

        self.audio = np.zeros((1, 0), dtype=np.float32)
        self.aformat = partial(filters.aformat, sample_fmts="flt", channel_layouts=1)
        self.stream_reader = StreamReader(filters=[self.aformat(sample_rates=self.rate)], frame_size=1024)
        self.writer = None
        if filename is not None:
            self.writer = Writer(filename, codec_name="pcm_f32le", format="flt", layout="mono", rate=self.rate)
        self.observe(self._on_chunk_change, names="chunk")
        self.observe(self._on_completed_change, names="completed")
        self.observe(self._on_rate_change, names="rate")
        if self.sync and self.verbose:
            self.output_label = Label()
            self.rtf_label = Label()
            display(VBox([self, self.output_label, self.rtf_label]))
        else:
            display(self)

    def _log_chunk(self, chunk):
        chunk_bytes = chunk.shape[0]
        recieved_bytes = self.stream_reader.bytestream.getbuffer().nbytes
        decoded_seconds = self.audio.shape[1] / self.rate
        self.output_label.value = "Chunk received" if self.language == "en" else "收到数据"
        self.output_label.value += f": {chunk_bytes}B/{recieved_bytes / 1024:.2f}KB ({decoded_seconds:.2f}s)."
        label = "实时率" if self.language == "zh" else "Real-Time Factor"
        if self.audio.shape[1] > 0:
            cost_time = time() - self.start
            decoded_seconds = self.audio.shape[1] / self.rate
            self.rtf_label.value = f"{label}: {cost_time / decoded_seconds:.2f}"
        else:
            self.rtf_label.value = f"{label}: 0.00"

    def _on_chunk_change(self, change):
        # The comm API is a symmetric, asynchronous, `fire and forget` style messaging API.
        # Sends a message to the frontend to indicate that a chunk has been received.
        self.send({"msg_type": "chunk_received"})

        if self.sync:
            if self.verbose:
                self._log_chunk(change["new"])
            self.stream_reader.push(change["new"].tobytes())
            for frame, _ in self.stream_reader.pull():
                self.audio = np.concatenate((self.audio, frame), axis=1)
                self.frame = frame

    def _on_completed_change(self, change):
        if not change["new"]:
            if self.sync:
                if self.verbose:
                    self.output_label.value = "Start recording." if self.language == "en" else "开始录音."
                self.start = time()
                self.audio = np.zeros((1, 0), dtype=np.float32)
                self.stream_reader.reset()
        else:
            if self.sync:
                if self.verbose:
                    self.output_label.value = "End recording." if self.language == "en" else "结束录音."
                for frame, _ in self.stream_reader.pull(partial=True):
                    self.audio = np.concatenate((self.audio, frame), axis=1)
                    self.frame = frame
                if self.writer is not None:
                    self.writer.write(self.audio)
                    self.writer.close()

    def _on_rate_change(self, change):
        self.stream_reader.filters = [self.aformat(sample_rates=self.rate)]
