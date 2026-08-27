import base64

import numpy as np
from audiolab import encode

from ipyaudio.recorder import Recorder


def test_recording_protocol_acknowledges_binary_chunks(monkeypatch):
    recorder = Recorder(sync=False, auto_display=False)
    messages = []
    monkeypatch.setattr(recorder, "send", messages.append)

    recorder._handle_frontend_message(
        recorder,
        {"msg_type": "recording_started", "rate": 48000},
        [],
    )
    recorder._handle_frontend_message(
        recorder,
        {"msg_type": "recording_chunk", "sequence": 0},
        [memoryview(b"abc")],
    )
    recorder._handle_frontend_message(
        recorder,
        {"msg_type": "recording_finished"},
        [],
    )

    assert recorder.rate == 48000
    assert recorder.chunk.tobytes() == b"abc"
    assert recorder.completed
    assert messages == [
        {"msg_type": "recording_ack", "sequence": 0},
        {"msg_type": "recording_finished_ack"},
    ]
    recorder.close()


def test_recording_protocol_rejects_out_of_order_chunks(monkeypatch):
    recorder = Recorder(sync=False, auto_display=False)
    messages = []
    monkeypatch.setattr(recorder, "send", messages.append)
    recorder._handle_frontend_message(
        recorder,
        {"msg_type": "recording_started", "rate": 16000},
        [],
    )

    recorder._handle_frontend_message(
        recorder,
        {"msg_type": "recording_chunk", "sequence": 2},
        [memoryview(b"abc")],
    )

    assert messages == [
        {"msg_type": "recording_error", "message": "Unexpected recording chunk 2"}
    ]
    recorder.close()


def test_streamed_audio_is_decoded_without_quadratic_concatenation(monkeypatch):
    expected = np.linspace(-0.5, 0.5, 1600, dtype=np.float32)[None, :]
    data_url, _ = encode(expected, sample_rate=16000, container_format="WAV")
    encoded_audio = base64.b64decode(data_url.split(",", 1)[1])
    recorder = Recorder(sync=True, auto_display=False)
    monkeypatch.setattr(recorder, "send", lambda _message: None)

    recorder._begin_recording(16000)
    for offset in range(0, len(encoded_audio), 400):
        recorder._process_chunk(
            np.frombuffer(encoded_audio[offset : offset + 400], dtype=np.uint8).copy()
        )
    recorder._finish_recording()

    np.testing.assert_allclose(recorder.audio, expected, atol=4e-5)
    recorder.close()
