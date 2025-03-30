#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

from pathlib import Path
from types import AsyncGeneratorType, GeneratorType
from typing import Optional, Union

import numpy as np
import torch
from lhotse import Recording
from lhotse.cut.base import Cut

from .player import Player
from .recorder import Recorder


def play(
    audio: Union[str, Path, np.ndarray, torch.Tensor, Cut, Recording, AsyncGeneratorType, GeneratorType],
    rate: Optional[int] = None,
    config: dict = {},
    language: str = "en",
    verbose: bool = False,
):
    Player(audio, rate, config, language, verbose).play()


def record(
    filename: str = None, config: dict = {}, player_config: dict = {}, language: str = "en", verbose: bool = False
):
    Recorder(filename, config, player_config, language, verbose)
