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

import PCMPlayer from './pcm_player'
import { createElement, createObjectURL, formatTime } from './utils'

interface WaveSurferConfig {
  options: WaveSurferOptions
  isStreaming: boolean
  language?: string
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

export default class WaveSurfer {
  public el: HTMLDivElement
  private _container: HTMLDivElement
  private _duration: HTMLDivElement
  private _currentTime: HTMLDivElement
  private _downloadButton: HTMLButtonElement
  private _wavesurfer: BaseWaveSurfer
  private _config: WaveSurferConfig
  // streaming
  private _pcmPlayer: PCMPlayer
  // recorder
  private _recorder: RecordPlugin
  private _micSelect: HTMLSelectElement
  private _recordButton: HTMLButtonElement
  private _pauseButton: HTMLButtonElement

  constructor(config: WaveSurferConfig) {
    this.el = createElement('div', 'lm-Widget')
    this._container = createElement('div', 'waveform')
    this._duration = createElement('div', 'duration', '0:00')
    this._currentTime = createElement('div', 'time', '0:00')
    this._container.append(this._duration, this._currentTime)
    this.el.append(this._container)
    this._config = config
  }

  load(url: string) {
    if (this._config.isStreaming) {
      this._pcmPlayer.feed(url)
      this._wavesurfer.load(this.url)
    } else {
      this._wavesurfer.load(url)
    }
  }

  set sampleRate(rate: number) {
    if (this._config.isStreaming) {
      this._pcmPlayer.sampleRate = rate
    }
    this._wavesurfer.options.sampleRate = rate
  }

  get url() {
    if (this._config.isStreaming) {
      return this._pcmPlayer.url
    } else {
      return createObjectURL(this._wavesurfer.getDecodedData())
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
    this._downloadButton = createElement('button', 'btn btn-success my-3')
    const label = this._config.language === 'zh' ? '下载' : 'Download'
    this._downloadButton.innerHTML = `${label} <i class="fa fa-download"></i>`
    this.el.append(this._downloadButton)
    this._downloadButton.onclick = () => {
      const link = document.createElement('a')
      link.href = this.url
      link.download = 'audio.wav'
      link.click()
    }
  }

  static createPlugins(config: WaveSurferConfig) {
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
    this._wavesurfer = BaseWaveSurfer.create({
      ...this._config.options,
      container: this._container,
      plugins: WaveSurfer.createPlugins(this._config),
    })
    this._wavesurfer.on('interaction', () => this._wavesurfer.playPause())
    this._wavesurfer.on('decode', (time) => (this._duration.textContent = formatTime(time)))
    this._wavesurfer.on('timeupdate', (time) => (this._currentTime.textContent = formatTime(time)))
  }

  createMicSelect() {
    if (this._config.plugins?.includes('record')) {
      this._micSelect = createElement('select', 'form-select-sm d-inline-block me-3 my-3 w-50')
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((stream) => {
          RecordPlugin.getAvailableAudioDevices().then((devices: MediaDeviceInfo[]) => {
            devices.forEach((device: MediaDeviceInfo) => {
              const option = document.createElement('option')
              option.value = device.deviceId
              option.text = device.label || device.deviceId
              this._micSelect.appendChild(option)
            })
          })
        })
        .catch((err) => {
          const label = this._config.language === 'zh' ? '访问麦克风失败' : 'Error accessing the microphone: '
          throw new Error(label + (err as Error).message)
        })
    }
  }

  createPauseButton() {
    this._pauseButton = createElement('button', 'btn btn-outline-danger me-3 my-3', '<i class="fa fa-pause"></i>')
    this._pauseButton.disabled = true
    this._pauseButton.onclick = () => {
      if (this._recorder.isRecording()) {
        this._recorder.pauseRecording()
        this._pauseButton.innerHTML = '<i class="fa fa-play"></i>'
      } else {
        this._recorder.resumeRecording()
        this._pauseButton.innerHTML = '<i class="fa fa-pause"></i>'
      }
    }
  }

  createRecordButton() {
    this._recordButton = createElement('button', 'btn btn-danger me-3 my-3', '<i class="fa fa-microphone"></i>')
    this._recordButton.onclick = () => {
      if (this._recorder.isRecording() || this._recorder.isPaused()) {
        this._recorder.stopRecording()
        this._pauseButton.disabled = true
        this._recordButton.innerHTML = '<i class="fa fa-microphone"></i>'
      } else {
        this._wavesurfer.options.normalize = false
        this._recorder.startRecording({ deviceId: this._micSelect.value }).then(() => {
          this._pauseButton.disabled = false
          this._recordButton.innerHTML = '<i class="fa fa-stop"></i>'
        })
      }
    }
  }

  createRecorder() {
    if (this._config.plugins?.includes('record')) {
      this._wavesurfer.toggleInteraction(false)
      this._recorder = this._wavesurfer.registerPlugin(RecordPlugin.create(this._config.pluginOptions?.record))
      this.createMicSelect()
      this.createPauseButton()
      this.createRecordButton()
      this.el.append(this._recordButton, this._pauseButton, this._micSelect)

      // this._recorder.on('record-data-available', (blob) => {
      // })

      this._recorder.on('record-progress', (time) => {
        this._currentTime.textContent = formatTime(time / 1000)
      })

      this._recorder.on('record-end', (blob) => {
        this._recordButton.innerHTML = '<i class="fa fa-microphone"></i>'
        this._pauseButton.disabled = true
        this._wavesurfer.load(URL.createObjectURL(blob))
        this._wavesurfer.toggleInteraction(true)
      })
    }
  }

  static create(config: WaveSurferConfig) {
    const instance = new WaveSurfer(config)
    instance.createWaveSurfer()
    instance.createPCMPlayer()
    instance.createRecorder()
    instance.createDownloadButton()
    return instance
  }
}
