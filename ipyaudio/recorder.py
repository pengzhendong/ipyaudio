# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

from collections.abc import Mapping, Sequence
from os import PathLike
from pathlib import Path
from typing import Any

import numpy as np
from audiolab import StreamReader, Writer
from ipydatawidgets import NDArray, array_serialization, shape_constraints
from IPython.display import display
from ipywidgets import HTML, DOMWidget, ValueWidget, VBox, register
from traitlets import Bool, Dict, Int, Unicode

from ._frontend import module_name, module_version
from .timer import Timer
from .utils import load_config, performance_table


@register
class Recorder(DOMWidget, ValueWidget):
    """Browser audio recorder with acknowledged, ordered chunk delivery.

    The widget protocol permits only one unacknowledged binary chunk at a
    time. This gives the frontend real backpressure without pretending that
    the underlying Jupyter comm ``send`` call is awaitable.
    """

    _model_name = Unicode("RecorderModel").tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode("RecorderView").tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    config = Dict(default_value={}).tag(sync=True)
    player_config = Dict(default_value={}).tag(sync=True)
    sync = Bool(False).tag(sync=True)
    language = Unicode("en").tag(sync=True)
    verbose = Bool(False).tag(sync=True)

    # Retained as observable Python-side state. Binary data now arrives through
    # custom comm buffers instead of round-tripping as a synced trait.
    chunk = (
        NDArray(dtype=np.uint8, default_value=np.zeros((0,), dtype=np.uint8))
        .tag(sync=False, **array_serialization)
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
        filename: str | PathLike[str] | None = None,
        config: Mapping[str, Any] | None = None,
        player_config: Mapping[str, Any] | None = None,
        sync: bool = False,
        language: str = "en",
        verbose: bool = False,
        *,
        auto_display: bool = True,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self.config = load_config("recorder", config)
        self.player_config = load_config("player", player_config)
        self.sync = sync or filename is not None
        self.language = language.lower()
        self.verbose = verbose
        self.filename = str(filename) if filename is not None else None

        self._frames: list[np.ndarray] = []
        self._audio_cache = np.zeros((1, 0), dtype=np.float32)
        self._audio_is_dirty = False
        self._decoded_samples = 0
        self._received_bytes = 0
        self._last_sequence = -1
        self._writer: Writer | None = None
        self._timer = Timer(language=self.language)
        self.stream_reader = self._create_stream_reader(self.rate)

        self.on_msg(self._handle_frontend_message)

        if self.sync and self.verbose:
            self._performance: dict[str, list[object]] = {
                "state": ["状态" if self.language == "zh" else "State", ""],
                "chunk": [
                    "接收数据" if self.language == "zh" else "Received Data",
                    "0B/0.00KB",
                ],
                "audio": [
                    "解码音频" if self.language == "zh" else "Decoded audio",
                    "0.00s",
                ],
                "latency": ["延迟" if self.language == "zh" else "Latency", "0ms"],
                "rtf": ["实时率" if self.language == "zh" else "Real-Time Factor", 0.0],
            }
            self._status = HTML(performance_table(self._performance))

        if auto_display:
            self.display()

    @property
    def audio(self) -> np.ndarray:
        """All decoded frames, concatenated lazily to avoid quadratic copies."""
        if self._audio_is_dirty:
            self._audio_cache = (
                np.concatenate(self._frames, axis=1)
                if self._frames
                else np.zeros((1, 0), dtype=np.float32)
            )
            self._audio_is_dirty = False
        return self._audio_cache

    def display(self) -> None:
        display(VBox([self, self._status]) if self.sync and self.verbose else self)

    def _render_status(self) -> None:
        if self.sync and self.verbose:
            self._status.value = performance_table(self._performance)

    @staticmethod
    def _create_stream_reader(rate: int) -> StreamReader:
        return StreamReader(
            dtype=np.float32,
            sample_rate=rate,
            to_mono=True,
            frame_size=1024,
        )

    def _begin_recording(self, rate: int) -> None:
        if self._writer is not None:
            self._writer.close()
            self._writer = None
        self.rate = rate
        self.completed = False
        self._frames.clear()
        self._audio_cache = np.zeros((1, 0), dtype=np.float32)
        self._audio_is_dirty = False
        self._decoded_samples = 0
        self._received_bytes = 0
        self._last_sequence = -1
        self.stream_reader.close()
        self.stream_reader = self._create_stream_reader(self.rate)
        self._timer.start()

        if self.filename is not None:
            container_format = Path(self.filename).suffix.lstrip(".") or "WAV"
            self._writer = Writer(
                self.filename, self.rate, container_format=container_format
            )
        if self.sync and self.verbose:
            self._performance["state"][1] = (
                "开始录音" if self.language == "zh" else "Start recording"
            )
            self._render_status()

    def _append_frame(self, frame: np.ndarray) -> None:
        self._frames.append(frame)
        self._audio_is_dirty = True
        self._decoded_samples += frame.shape[1]
        self.frame = frame

    def _process_chunk(self, chunk: np.ndarray) -> None:
        self.chunk = chunk
        if not self.sync:
            return
        self._received_bytes += chunk.size
        self.stream_reader.push(chunk.tobytes())
        for frame, _ in self.stream_reader.pull():
            self._append_frame(frame)

        if self.verbose:
            decoded_seconds = self._decoded_samples / self.rate
            elapsed = self._timer.elapsed()
            self._performance["chunk"][1] = (
                f"{chunk.size}B/{self._received_bytes / 1024:.2f}KB"
            )
            self._performance["audio"][1] = f"{decoded_seconds:.2f}s"
            self._performance["latency"][1] = (
                f"{int((elapsed - decoded_seconds) * 1000)}ms"
            )
            self._performance["rtf"][1] = (
                round(elapsed / decoded_seconds, 2) if decoded_seconds else 0.0
            )
            self._render_status()

    def _finish_recording(self) -> None:
        if self.sync:
            for frame, _ in self.stream_reader.pull(partial=True):
                self._append_frame(frame)
            if self._writer is not None:
                self._writer.write(self.audio)
                self._writer.close()
                self._writer = None
            if self.verbose:
                self._performance["state"][1] = (
                    "结束录音" if self.language == "zh" else "End recording"
                )
                self._render_status()
        self.completed = True

    def _handle_frontend_message(
        self,
        _widget: DOMWidget,
        content: Mapping[str, Any],
        buffers: Sequence[memoryview | bytes | bytearray],
    ) -> None:
        message_type = content.get("msg_type")
        if message_type == "recording_started":
            self._begin_recording(int(content["rate"]))
            return

        if message_type == "recording_chunk":
            sequence = int(content["sequence"])
            if sequence <= self._last_sequence:
                self.send({"msg_type": "recording_ack", "sequence": sequence})
                return
            if sequence != self._last_sequence + 1 or len(buffers) != 1:
                self.send(
                    {
                        "msg_type": "recording_error",
                        "message": f"Unexpected recording chunk {sequence}",
                    }
                )
                return
            try:
                chunk = np.frombuffer(buffers[0], dtype=np.uint8).copy()
                self._process_chunk(chunk)
            except Exception as error:  # noqa: BLE001 - protocol boundary
                self.send({"msg_type": "recording_error", "message": str(error)})
                return
            self._last_sequence = sequence
            self.send({"msg_type": "recording_ack", "sequence": sequence})
            return

        if message_type == "recording_finished":
            self._finish_recording()
            self.send({"msg_type": "recording_finished_ack"})

    def close(self) -> None:
        if self._writer is not None:
            self._writer.close()
            self._writer = None
        self.stream_reader.close()
        super().close()
