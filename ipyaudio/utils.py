#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

import base64
from pathlib import Path
from typing import Optional, Union

import numpy as np
import torch
from IPython.display import Audio
from lhotse import Recording
from lhotse.cut.base import Cut


def encode(
    audio: Union[str, Path, np.ndarray, torch.Tensor, Cut, Recording],
    rate: Optional[int] = None,
    with_header: bool = True,
):
    """Transform an audio to a PCM bytestring"""
    if isinstance(audio, (str, Path)):
        if audio.startswith(("http://", "https://")):
            return audio, rate or 16000
        audio = Recording.from_file(audio)
    if isinstance(audio, (Cut, Recording)):
        if rate is not None:
            audio = audio.resample(rate)
        rate = audio.sampling_rate
        audio = audio.load_audio()
    if with_header:
        return Audio(audio, rate=rate).src_attr(), rate
    audio = np.clip(audio, -1, 1)
    audio, _ = Audio._validate_and_normalize_with_numpy(audio, False)
    return base64.b64encode(audio).decode("ascii"), rate


def merge_dicts(d1, d2):
    for k in d2:
        if k in d1 and isinstance(d1[k], dict) and isinstance(d2[k], dict):
            merge_dicts(d1[k], d2[k])
        else:
            d1[k] = d2[k]
    return d1
