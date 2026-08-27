# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterable, Iterator, Mapping
from contextlib import suppress
from typing import Any

from audiolab import encode
from IPython.display import display
from ipywidgets import HTML, DOMWidget, ValueWidget, VBox, register
from traitlets import Bool, Dict, Int, Unicode

from ._frontend import module_name, module_version
from .timer import Timer
from .utils import load_config, performance_table


@register
class Player(DOMWidget, ValueWidget):
    """Audio player widget with managed support for streamed audio.

    Async streams run in one owned task. Use :meth:`wait_until_done` when the
    producer's completion or exception matters, and :meth:`cancel_stream` when
    replacing or abandoning it.
    """

    _model_name = Unicode("PlayerModel").tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode("PlayerView").tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    config = Dict(default_value={}).tag(sync=True)
    language = Unicode("en").tag(sync=True)
    verbose = Bool(False).tag(sync=True)

    audio = Unicode("").tag(sync=True)
    rate = Int(16000).tag(sync=True)

    def __init__(
        self,
        config: Mapping[str, Any] | None = None,
        language: str = "en",
        verbose: bool = False,
        *,
        auto_display: bool = True,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self.config = load_config("player", config)
        self.language = language.lower()
        self.verbose = verbose
        self._stream_task: asyncio.Task[None] | None = None
        self._stream_error: BaseException | None = None
        self._duration = 0.0

        if self.verbose:
            self._performance: dict[str, list[object]] = {
                "latency": ["延迟" if self.language == "zh" else "Latency", "0ms"],
                "rtf": [
                    "实时率" if self.language == "zh" else "Real-Time Factor",
                    "0.00",
                ],
            }
            self._status = HTML(performance_table(self._performance))

        if auto_display:
            self.display()

    def display(self) -> None:
        """Display the widget and, when enabled, its performance panel."""
        display(VBox([self, self._status]) if self.verbose else self)

    @property
    def is_streaming(self) -> bool:
        return self._stream_task is not None and not self._stream_task.done()

    @property
    def stream_error(self) -> BaseException | None:
        return self._stream_error

    def _encode_chunk(self, index: int, chunk: Any, rate: int, timer: Timer) -> None:
        if self.verbose:
            if index == 0:
                self._performance["latency"][1] = f"{int(timer.elapsed() * 1000)}ms"
            sample_count = chunk.shape[-1]
            self._duration += sample_count / rate
            self._performance["rtf"][1] = round(timer.elapsed() / self._duration, 2)
            self._status.value = performance_table(self._performance)
        self.audio, self.rate = encode(
            chunk,
            sample_rate=rate,
            include_container=False,
            to_mono=True,
        )

    async def _consume_async_stream(
        self, audio: AsyncIterable[Any], rate: int, timer: Timer
    ) -> None:
        try:
            self.send({"msg_type": "reset", "is_streaming": True})
            index = 0
            async for chunk in audio:
                self._encode_chunk(index, chunk, rate, timer)
                index += 1
        except asyncio.CancelledError:
            self.send({"msg_type": "stream_cancelled"})
            raise
        except BaseException as error:
            self._stream_error = error
            self.send({"msg_type": "stream_error", "message": str(error)})
            raise
        else:
            self.send({"msg_type": "stream_finished"})

    def _consume_sync_stream(
        self, audio: Iterator[Any], rate: int, timer: Timer
    ) -> None:
        try:
            for index, chunk in enumerate(audio):
                self._encode_chunk(index, chunk, rate, timer)
        except BaseException as error:
            self._stream_error = error
            self.send({"msg_type": "stream_error", "message": str(error)})
            raise
        else:
            self.send({"msg_type": "stream_finished"})

    def _observe_stream_result(self, task: asyncio.Task[None]) -> None:
        """Retrieve the result so an un-awaited task never becomes orphaned."""
        if task.cancelled():
            return
        with suppress(BaseException):
            task.exception()

    def load(
        self,
        audio: Any,
        rate: int | None = None,
    ) -> Player:
        """Load a complete audio source or start consuming an audio stream."""
        self.cancel_stream()
        self._stream_task = None
        self._stream_error = None
        self._duration = 0.0
        if rate is not None:
            self.rate = rate

        is_async_stream = isinstance(audio, AsyncIterable)
        is_sync_stream = isinstance(audio, Iterator)
        timer = Timer(language=self.language)

        if is_async_stream:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError as error:
                raise RuntimeError(
                    "Async audio streams require a running event loop; call load() from an async context."
                ) from error
            self._stream_task = loop.create_task(
                self._consume_async_stream(audio, self.rate, timer),
                name="ipyaudio-player-stream",
            )
            self._stream_task.add_done_callback(self._observe_stream_result)
        elif is_sync_stream:
            self.send({"msg_type": "reset", "is_streaming": True})
            self._consume_sync_stream(audio, self.rate, timer)
        else:
            self.send({"msg_type": "reset", "is_streaming": False})
            self.audio, self.rate = encode(audio, sample_rate=self.rate)
        return self

    async def wait_until_done(self) -> None:
        """Wait for the active async stream and propagate its exception."""
        if self._stream_task is not None:
            await asyncio.shield(self._stream_task)

    def cancel_stream(self) -> bool:
        """Cancel the active async stream, returning whether one was cancelled."""
        if self._stream_task is None or self._stream_task.done():
            return False
        self._stream_task.cancel()
        return True

    def play(self) -> None:
        self.send({"msg_type": "play"})

    def pause(self) -> None:
        self.send({"msg_type": "pause"})

    def close(self) -> None:
        self.cancel_stream()
        super().close()
