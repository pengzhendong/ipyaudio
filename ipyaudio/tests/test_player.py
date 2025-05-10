#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

from ..player import Player


def test_player():
    player = Player("https://modelscope.cn/datasets/pengzhendong/filesamples/resolve/master/audio/aac/sample1.aac")
    assert player.rate == 16000
