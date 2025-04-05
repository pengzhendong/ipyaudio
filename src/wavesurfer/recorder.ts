// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

import WaveSurfer, { WaveSurferOptions } from 'wavesurfer.js'
import RecordPlugin, { RecordPluginOptions } from 'wavesurfer.js/dist/plugins/record.js'

import Player, { PlayerConfig } from './player'
import { createElement, formatTime } from './utils'

interface RecorderConfig {
  options: WaveSurferOptions
  language?: string
  recordOptions?: RecordPluginOptions
}

export default class Recorder {
  public el: HTMLDivElement
  private _container: HTMLDivElement
  private _currentTime: HTMLDivElement
  private _wavesurfer: WaveSurfer
  private _config: RecorderConfig
  private _recorder: RecordPlugin
  private _micSelect: HTMLSelectElement
  private _rateSelect: HTMLSelectElement
  private _recordButton: HTMLButtonElement
  private _pauseButton: HTMLButtonElement
  private _player: Player

  constructor(config: RecorderConfig, playerConfig: PlayerConfig) {
    this.el = createElement('div', 'lm-Widget')
    this._container = createElement('div', 'waveform')
    this._currentTime = createElement('div', 'time', '0:00')
    this._container.append(this._currentTime)
    this._config = config
    this._player = Player.create(playerConfig)
  }

  get sampleRate() {
    return this._wavesurfer.options.sampleRate
  }

  get timeSlice() {
    return this._config.recordOptions?.mediaRecorderTimeslice
  }

  set sampleRate(rate: number) {
    this._wavesurfer.options.sampleRate = rate
    this._player.sampleRate = rate
  }

  createWaveSurfer() {
    this._wavesurfer = WaveSurfer.create({
      ...this._config.options,
      container: this._container,
    })
  }

  createRateSelect() {
    this._rateSelect = createElement('select', 'form-select-sm d-inline-block me-3 my-3 w-25')
    const rates = [8000, 16000, 22050, 24000, 44100, 48000]
    rates.forEach((rate: number) => {
      const option = document.createElement('option')
      option.value = rate.toString()
      option.text = `${rate} Hz`
      if (rate === 16000) {
        option.selected = true
      }
      this._rateSelect.appendChild(option)
    })
  }

  createMicSelect() {
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

  createPauseButton() {
    this._pauseButton = createElement('button', 'btn btn-outline-danger me-3 my-3', '<i class="fa fa-pause"></i>')
    this._pauseButton.disabled = true
    this._pauseButton.onclick = () => {
      if (this._recorder.isRecording()) {
        this._recorder.pauseRecording()
        this._pauseButton.innerHTML = '<i class="fa fa-play"></i>'
        this._container.style.display = 'none'
        this._player.el.style.display = 'block'
      } else {
        this._recorder.resumeRecording()
        this._pauseButton.innerHTML = '<i class="fa fa-pause"></i>'
        this._container.style.display = 'block'
        this._player.el.style.display = 'none'
      }
    }
  }

  createRecordButton() {
    this._recordButton = createElement('button', 'btn btn-danger me-3 my-3', '<i class="fa fa-microphone"></i>')
    this._recordButton.onclick = () => {
      if (this._recorder.isRecording() || this._recorder.isPaused()) {
        this._recorder.stopRecording()
        this._container.style.display = 'none'
        this._player.el.style.display = 'block'
      } else {
        this._wavesurfer.options.normalize = false
        this.sampleRate = parseInt(this._rateSelect.value)
        this._recorder.startRecording({ deviceId: this._micSelect.value }).then(() => {
          this._pauseButton.disabled = false
          this._rateSelect.disabled = true
          this._micSelect.disabled = true
          this._pauseButton.innerHTML = '<i class="fa fa-pause"></i>'
          this._recordButton.innerHTML = '<i class="fa fa-stop"></i>'
          this._container.style.display = 'block'
          this._player.el.style.display = 'none'
        })
      }
    }
  }

  onRecordStart(callback: () => void) {
    this._recorder.on('record-start', () => {
      callback()
    })
  }

  onRecordChunk(callback: (blob: Blob) => void) {
    this._recorder.on('record-data-available', (blob) => {
      callback(blob)
    })
  }

  onRecordEnd(callback: (blob: Blob) => Promise<void>) {
    this._recorder.on('record-end', async (blob) => {
      this._player.load(URL.createObjectURL(blob))
      this._recordButton.disabled = true
      this._pauseButton.disabled = true
      await callback(blob)
      this._recordButton.disabled = false
      this._pauseButton.disabled = true
      this._rateSelect.disabled = false
      this._micSelect.disabled = false
      this._pauseButton.innerHTML = '<i class="fa fa-play"></i>'
      this._recordButton.innerHTML = '<i class="fa fa-microphone"></i>'
    })
  }

  createRecorder() {
    this._wavesurfer.toggleInteraction(false)
    this._recorder = this._wavesurfer.registerPlugin(RecordPlugin.create(this._config.recordOptions))
    this.createRateSelect()
    this.createMicSelect()
    this.createPauseButton()
    this.createRecordButton()
    this._container.style.display = 'none'
    this._player.el.style.display = 'none'
    this.el.append(
      this._recordButton,
      this._pauseButton,
      this._rateSelect,
      this._micSelect,
      this._container,
      this._player.el,
    )

    this._recorder.on('record-pause', (blob) => {
      this._player.load(URL.createObjectURL(blob))
    })

    this._recorder.on('record-progress', (time) => {
      this._currentTime.textContent = formatTime(time / 1000)
    })
  }

  static create(config: RecorderConfig, playerConfig: PlayerConfig) {
    const instance = new Recorder(config, playerConfig)
    instance.createWaveSurfer()
    instance.createRecorder()
    return instance
  }
}
