# ipyaudio

[![Build Status](https://travis-ci.org/pengzhendong/ipyaudio.svg?branch=master)](https://travis-ci.org/pengzhendong/ipyaudio)
[![codecov](https://codecov.io/gh/pengzhendong/ipyaudio/branch/master/graph/badge.svg)](https://codecov.io/gh/pengzhendong/ipyaudio)

A Custom Jupyter Widget Library

## Installation

```bash
pip install ipyaudio
```

## Development Installation

Create a dev environment:

```bash
conda create -n ipyaudio-dev -c conda-forge nodejs python jupyterlab
conda activate ipyaudio-dev
```

Install the python. This will also build the TS package.

```bash
pip install -e ".[test, examples]"
```

When developing your extensions, you need to manually enable your extensions with the
lab frontend.

```bash
jupyter labextension develop --overwrite .
jlpm run build
```

### How to see your changes

#### Typescript:

If you use JupyterLab to develop then you can watch the source directory and run JupyterLab at the same time in different
terminals to watch for changes in the extension's source and automatically rebuild the widget.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm run watch
# Run JupyterLab in another terminal
jupyter lab
```

After a change wait for the build to finish and then refresh your browser and the changes should take effect.

#### Python:

If you make a change to the python code then you will need to restart the notebook kernel to have it take effect.

## Updating the version

To update the version, install tbump and use it to bump the version.
By default it will also create a tag.

```bash
pip install tbump
tbump <new-version>
```
