// Copyright (c) Zhendong Peng.
// Distributed under the terms of the Modified BSD License.

import Player, { PlayerConfig } from '../wavesurfer/player'

describe('waveform player', () => {
  it('does not attach zoom before audio has been loaded', () => {
    const config = {
      options: { container: document.createElement('div') },
      plugins: ['zoom'],
    } as PlayerConfig

    expect(Player.createPlugins(config)).toEqual([])
  })
})
