#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Zhendong Peng.
# Distributed under the terms of the Modified BSD License.

from jinja2 import Template

template = """<table class="table table-bordered border-black">
    <tr class="table-active">
        {%- for key in dict.keys() %}
        <th>{{ dict[key][0] }}</th>
        {%- endfor %}
    </tr>
        {%- for key in dict.keys() %}
        <td>{{ dict[key][1] }}</td>
        {%- endfor %}
    </tr>
</table>"""


def merge_dicts(d1, d2):
    for k in d2:
        if k in d1 and isinstance(d1[k], dict) and isinstance(d2[k], dict):
            merge_dicts(d1[k], d2[k])
        else:
            d1[k] = d2[k]
    return d1


def table(dict: dict[str, list[str, str]]):
    return Template(template).render(dict=dict)
