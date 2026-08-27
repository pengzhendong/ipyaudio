# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations

from collections.abc import Mapping
from copy import deepcopy
from html import escape
from importlib.resources import files
from typing import Any


def load_config(
    name: str, overrides: Mapping[str, Any] | None = None
) -> dict[str, Any]:
    """Load a bundled JSON configuration and apply user overrides."""
    import json

    path = files("ipyaudio.configs").joinpath(f"{name}.json")
    defaults = json.loads(path.read_text(encoding="utf-8"))
    return merge_mappings(defaults, overrides)


def merge_mappings(
    defaults: Mapping[str, Any], overrides: Mapping[str, Any] | None = None
) -> dict[str, Any]:
    """Return a deep merge without mutating either input mapping."""
    result = deepcopy(dict(defaults))
    for key, value in (overrides or {}).items():
        if isinstance(result.get(key), Mapping) and isinstance(value, Mapping):
            result[key] = merge_mappings(result[key], value)
        else:
            result[key] = deepcopy(value)
    return result


def performance_table(metrics: Mapping[str, tuple[str, object] | list[object]]) -> str:
    """Render the small status table used by the verbose widgets."""
    headings = "".join(
        f"<th>{escape(str(metric[0]))}</th>" for metric in metrics.values()
    )
    values = "".join(
        f"<td>{escape(str(metric[1]))}</td>" for metric in metrics.values()
    )
    return (
        '<table class="table table-bordered border-black">'
        f'<tr class="table-active">{headings}</tr>'
        f"<tr>{values}</tr>"
        "</table>"
    )


# Backwards-compatible aliases for code importing the old utility names.
merge_dicts = merge_mappings
table = performance_table
