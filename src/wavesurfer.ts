// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

import BaseWaveSurfer, { WaveSurferOptions } from 'wavesurfer.js'
import { type GenericPlugin } from 'wavesurfer.js/dist/base-plugin.js'
import HoverPlugin, { HoverPluginOptions } from 'wavesurfer.js/dist/plugins/hover.js'
import MinimapPlugin, { MinimapPluginOptions } from 'wavesurfer.js/dist/plugins/minimap.js'
import RecordPlugin, { RecordPluginOptions } from 'wavesurfer.js/dist/plugins/record.js'
import SpectrogramPlugin, { SpectrogramPluginOptions } from 'wavesurfer.js/dist/plugins/spectrogram.js'
import TimelinePlugin, { TimelinePluginOptions } from 'wavesurfer.js/dist/plugins/timeline.js'
import ZoomPlugin, { ZoomPluginOptions } from 'wavesurfer.js/dist/plugins/zoom.js'

interface WaveSurferConfig {
  options: WaveSurferOptions
  plugins?: string[]
  pluginOptions?: {
    hover?: HoverPluginOptions
    minimap?: MinimapPluginOptions
    record?: RecordPluginOptions
    spectrogram?: SpectrogramPluginOptions
    timeline?: TimelinePluginOptions
    zoom?: ZoomPluginOptions
  }
}

export class WaveSurfer {
  static create(config: WaveSurferConfig) {
    const pluginMap = {
      hover: () => HoverPlugin.create(config.pluginOptions?.hover),
      minimap: () =>
        MinimapPlugin.create({
          ...config.pluginOptions?.minimap,
          plugins: [
            HoverPlugin.create({
              ...config.pluginOptions?.hover,
              lineWidth: 1,
            }),
          ],
        }),
      record: () => RecordPlugin.create(config.pluginOptions?.record),
      spectrogram: () => SpectrogramPlugin.create(config.pluginOptions?.spectrogram),
      timeline: () => TimelinePlugin.create(config.pluginOptions?.timeline),
      zoom: () => ZoomPlugin.create(config.pluginOptions?.zoom),
    }

    const _plugins = Array.from(config.plugins ?? [])
      .map((plugin) => pluginMap[plugin as keyof typeof pluginMap]?.())
      .filter(Boolean) as GenericPlugin[]
    const wavesurfer = BaseWaveSurfer.create({
      ...config.options,
      plugins: _plugins,
    })
    wavesurfer.on('interaction', () => wavesurfer.playPause())
    return wavesurfer
  }
}

export default BaseWaveSurfer
