# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

from collections.abc import Mapping
from os import PathLike
from typing import Any

from .player import Player
from .recorder import Recorder


def play(
    audio: Any,
    rate: int | None = None,
    config: Mapping[str, Any] | None = None,
    language: str = "en",
    verbose: bool = False,
) -> Player:
    """Display a player, load ``audio``, and return the controllable widget."""
    player = Player(config=config, language=language, verbose=verbose)
    return player.load(audio, rate)


def record(
    filename: str | PathLike[str] | None = None,
    config: Mapping[str, Any] | None = None,
    player_config: Mapping[str, Any] | None = None,
    sync: bool = False,
    language: str = "en",
    verbose: bool = False,
) -> Recorder:
    """Display and return a recorder widget."""
    return Recorder(
        filename=filename,
        config=config,
        player_config=player_config,
        sync=sync,
        language=language,
        verbose=verbose,
    )
