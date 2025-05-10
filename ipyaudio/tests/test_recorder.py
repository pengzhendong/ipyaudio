#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

from ..recorder import Recorder


def test_recorder():
    recorder = Recorder()
    assert recorder.sync == False

    recorder = Recorder("audio.wav")
    assert recorder.sync == True
