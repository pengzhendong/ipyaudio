#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

import json
import os

from IPython.display import display
from ipywidgets import DOMWidget, ValueWidget, register
from traitlets import Bool, Dict, Unicode

from ._frontend import module_name, module_version
from .utils import merge_dicts


@register
class Recorder(DOMWidget, ValueWidget):
    _model_name = Unicode("RecorderModel").tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode("RecorderView").tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    _config_path = os.path.join(os.path.dirname(__file__), "../recorder.json")
    config = Dict(json.load(open(_config_path))).tag(sync=True)
    language = Unicode("en").tag(sync=True)
    verbose = Bool(False).tag(sync=True)

    def __init__(self, config: dict = {}, language: str = "en", verbose: bool = False, **kwargs):
        super().__init__(**kwargs)
        self.config = merge_dicts(self.config, config)
        self.language = language.lower()
        self.verbose = verbose

    def record(self):
        display(self)
