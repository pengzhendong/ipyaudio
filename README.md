<div align="center">

# ipyaudio

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/pengzhendong/ipyaudio/HEAD?urlpath=%2Fdoc%2Ftree%2Fexamples%2Fintroduction.ipynb)
[![PyPI](https://img.shields.io/pypi/v/ipyaudio.svg)](https://pypi.org/project/ipyaudio)
[![PyPI Downloads](https://static.pepy.tech/badge/ipyaudio)](https://pepy.tech/projects/ipyaudio)
[![Release](https://img.shields.io/github/release/pengzhendong/ipyaudio.svg)](https://github.com/pengzhendong/ipyaudio/releases)
[![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![Build Status](https://travis-ci.org/pengzhendong/ipyaudio.svg?branch=master)](https://travis-ci.org/pengzhendong/ipyaudio)
[![codecov](https://codecov.io/gh/pengzhendong/ipyaudio/branch/master/graph/badge.svg)](https://codecov.io/gh/pengzhendong/ipyaudio)
[![Stars](https://img.shields.io/github/stars/pengzhendong/ipyaudio)](https://github.com/pengzhendong/ipyaudio)

A Jupyter Widget for Web Audio Playing and Recording.

</div>

<br/>

## Installation

```bash
$ pip install ipyaudio
```

## Usage

```python
>>> !wget https://modelscope.cn/datasets/pengzhendong/filesamples/resolve/master/audio/aac/sample1.aac -O sample1.aac
>>> audio_url = "https://modelscope.cn/datasets/pengzhendong/filesamples/resolve/master/audio/aac/sample1.aac"
>>> audio_path = "sample1.aac"
```

### Player

- Play an audio from url

![](images/player/url.png)

- Play a local audio

![](images/player/local.png)

- Play a numpy ndarray

![](images/player/numpy.png)

- Play an audio stream

![](images/player/stream.png)

### Recorder

- Record an audio with callback function

![](images/recorder/callback.png)

- Record an audio to file

![](images/recorder/save.png)
