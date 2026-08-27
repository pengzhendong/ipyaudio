# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

import re

__version__ = "0.1.32"
_version_match = re.match(r"^(\d+)\.(\d+)\.(\d+)", __version__)
if _version_match is None:  # pragma: no cover - guarded by the release tooling
    raise ValueError(f"Invalid version: {__version__}")
version_info = tuple(int(part) for part in _version_match.groups())
