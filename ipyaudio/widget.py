#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

import time
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
    player = Player(config, language, verbose)
    # Wait for the player to be initialized
    time.sleep(0.1)
    player.load(audio, rate)


def record(
    filename: str = None,
    config: dict = {},
    player_config: dict = {},
    sync: bool = False,
    language: str = "en",
    verbose: bool = False,
):
    Recorder(filename, config, player_config, sync, language, verbose)
