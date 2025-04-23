// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

import WaveSurfer, { WaveSurferOptions } from 'wavesurfer.js'
import { type GenericPlugin } from 'wavesurfer.js/dist/base-plugin.js'
import HoverPlugin, { HoverPluginOptions } from 'wavesurfer.js/dist/plugins/hover.js'
import MinimapPlugin, { MinimapPluginOptions } from 'wavesurfer.js/dist/plugins/minimap.js'
import SpectrogramPlugin, { SpectrogramPluginOptions } from 'wavesurfer.js/dist/plugins/spectrogram.js'
import TimelinePlugin, { TimelinePluginOptions } from 'wavesurfer.js/dist/plugins/timeline.js'
import ZoomPlugin, { ZoomPluginOptions } from 'wavesurfer.js/dist/plugins/zoom.js'

import PCMPlayer from './pcm_player'
import { createRewardDropdown } from './reward'
import { createElement, createObjectURL, formatTime } from './utils'

export interface PlayerConfig {
  options: WaveSurferOptions
  isStreaming: boolean
  language?: string
  plugins?: string[]
  pluginOptions?: {
    hover?: HoverPluginOptions
    minimap?: MinimapPluginOptions
    spectrogram?: SpectrogramPluginOptions
    timeline?: TimelinePluginOptions
    zoom?: ZoomPluginOptions
  }
}

export default class Player {
  public el: HTMLDivElement
  private _container: HTMLDivElement
  private _duration: HTMLDivElement
  private _currentTime: HTMLDivElement
  private _wavesurfer: WaveSurfer
  private _config: PlayerConfig
  // streaming
  private _pcmPlayer: PCMPlayer

  constructor(config: PlayerConfig) {
    this.el = createElement('div', 'lm-Widget')
    this._container = createElement('div', 'waveform')
    this._duration = createElement('div', 'duration', '0:00')
    this._currentTime = createElement('div', 'time', '0:00')
    this._container.append(this._duration, this._currentTime)
    this.el.append(this._container)
    this._config = config
  }

  get url() {
    if (this._config.isStreaming) {
      return this._pcmPlayer.url
    } else {
      return createObjectURL(this._wavesurfer.getDecodedData())
    }
  }

  set sampleRate(rate: number) {
    if (this._config.isStreaming) {
      this._pcmPlayer.sampleRate = rate
    }
    this._wavesurfer.options.sampleRate = rate
  }

  load(url: string) {
    if (this._config.isStreaming) {
      this._pcmPlayer.feed(url)
      this._wavesurfer.load(this.url)
    } else {
      this._wavesurfer.load(url)
    }
  }

  setDone() {
    this._pcmPlayer.setDone()
  }

  createPCMPlayer() {
    if (this._config.isStreaming) {
      this._pcmPlayer = new PCMPlayer({
        channels: 1,
        sampleRate: this._config.options.sampleRate,
      })
      this.el.append(this._pcmPlayer.playButton)
    }
  }

  createDownloadButton() {
    const downloadButton = createElement('button', 'btn btn-success my-3')
    const label = this._config.language === 'zh' ? '下载' : 'Download'
    downloadButton.innerHTML = `${label} <i class="fa fa-download"></i>`
    downloadButton.onclick = () => {
      const link = document.createElement('a')
      link.href = this.url
      link.download = 'audio.wav'
      link.click()
    }
    this.el.append(downloadButton)
  }

  static createPlugins(config: PlayerConfig) {
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
      spectrogram: () => SpectrogramPlugin.create(config.pluginOptions?.spectrogram),
      timeline: () => TimelinePlugin.create(config.pluginOptions?.timeline),
      zoom: () => ZoomPlugin.create(config.pluginOptions?.zoom),
    }
    return Array.from(config.plugins ?? [])
      .map((plugin) => pluginMap[plugin as keyof typeof pluginMap]?.())
      .filter(Boolean) as GenericPlugin[]
  }

  createWaveSurfer() {
    this._wavesurfer = WaveSurfer.create({
      ...this._config.options,
      container: this._container,
      plugins: Player.createPlugins(this._config),
    })
    this._wavesurfer.on('interaction', () => this._wavesurfer.playPause())
    this._wavesurfer.on('decode', (time) => (this._duration.textContent = formatTime(time)))
    this._wavesurfer.on('timeupdate', (time) => (this._currentTime.textContent = formatTime(time)))
  }

  static create(config: PlayerConfig) {
    const instance = new Player(config)
    instance.createWaveSurfer()
    instance.createPCMPlayer()
    instance.createDownloadButton()
    instance.el.appendChild(createRewardDropdown(config.language || 'en'))
    return instance
  }
}
