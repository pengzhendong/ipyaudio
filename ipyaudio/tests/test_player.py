import asyncio

import numpy as np
import pytest

from ipyaudio.player import Player


def test_complete_audio_load_returns_the_player(monkeypatch):
    player = Player(auto_display=False)
    monkeypatch.setattr(player, "send", lambda _message: None)

    result = player.load(np.zeros((1, 16), dtype=np.float32), rate=16000)

    assert result is player
    assert player.audio.startswith("data:audio/WAV;base64,")
    player.close()


def test_async_stream_is_owned_and_finishes_after_last_chunk(monkeypatch):
    encoded_chunks = []

    def fake_encode(chunk, sample_rate, **_kwargs):
        encoded_chunks.append(chunk)
        return f"chunk-{len(encoded_chunks)}", sample_rate

    async def stream():
        yield np.zeros((1, 8), dtype=np.float32)
        await asyncio.sleep(0)
        yield np.ones((1, 8), dtype=np.float32)

    monkeypatch.setattr("ipyaudio.player.encode", fake_encode)
    player = Player(auto_display=False)
    messages = []
    monkeypatch.setattr(player, "send", messages.append)

    async def run_stream():
        assert player.load(stream(), rate=8000) is player
        assert player.is_streaming
        await player.wait_until_done()

    asyncio.run(run_stream())

    assert len(encoded_chunks) == 2
    assert player.audio == "chunk-2"
    assert messages[-1] == {"msg_type": "stream_finished"}
    assert not player.is_streaming
    player.close()


def test_async_stream_exception_is_observable(monkeypatch):
    async def broken_stream():
        yield np.zeros((1, 1), dtype=np.float32)
        raise ValueError("bad producer")

    monkeypatch.setattr(
        "ipyaudio.player.encode",
        lambda _chunk, sample_rate, **_kwargs: ("chunk", sample_rate),
    )
    player = Player(auto_display=False)
    messages = []
    monkeypatch.setattr(player, "send", messages.append)

    async def run_stream():
        player.load(broken_stream())
        with pytest.raises(ValueError, match="bad producer"):
            await player.wait_until_done()

    asyncio.run(run_stream())

    assert isinstance(player.stream_error, ValueError)
    assert messages[-1] == {"msg_type": "stream_error", "message": "bad producer"}
    player.close()


def test_async_stream_can_be_cancelled(monkeypatch):
    async def endless_stream():
        yield np.zeros((1, 1), dtype=np.float32)
        await asyncio.Event().wait()

    monkeypatch.setattr(
        "ipyaudio.player.encode",
        lambda _chunk, sample_rate, **_kwargs: ("chunk", sample_rate),
    )
    player = Player(auto_display=False)
    messages = []
    monkeypatch.setattr(player, "send", messages.append)

    async def run_stream():
        player.load(endless_stream())
        await asyncio.sleep(0)
        assert player.cancel_stream()
        with pytest.raises(asyncio.CancelledError):
            await player.wait_until_done()

    asyncio.run(run_stream())

    assert messages[-1] == {"msg_type": "stream_cancelled"}
    player.close()
