// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

import { createElement, createObjectURL } from './utils'

export class PCMPlayer {
  public playButton: HTMLButtonElement
  private _isDone: boolean = false
  private _isPlaying: boolean = true
  private _interval: number
  private _samples: Int16Array = new Int16Array(0)
  private _allSamples: Int16Array = new Int16Array(0)
  private _audioCtx: AudioContext
  private _gainNode: GainNode
  private _startTime: number
  private _options: { channels: number; sampleRate: number; flushTime: number; language: string }

  constructor(
    options?: Partial<{
      channels: number
      sampleRate: number
      flushTime: number
      language: string
    }>,
  ) {
    this._options = Object.assign({ channels: 1, sampleRate: 16000, flushTime: 100, language: 'en' }, options)
    this.playButton = createElement('button', 'btn btn-danger me-3 my-3', '<i class="fa fa-pause"></i>')
    this.playButton.onclick = () => {
      this._isPlaying ? this.pause() : this.play()
    }

    this._interval = window.setInterval(this.flush.bind(this), this._options.flushTime)
    this._audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    this._gainNode = this._audioCtx.createGain()
    this._gainNode.gain.value = 1.0
    this._gainNode.connect(this._audioCtx.destination)
    this._startTime = this._audioCtx.currentTime
  }

  set sampleRate(rate: number) {
    this._options.sampleRate = rate
  }

  setDone() {
    this._isDone = true
  }

  feed(base64Data: string) {
    const binaryString = atob(base64Data)
    const buffer = new ArrayBuffer(binaryString.length)
    const bufferView = new Uint8Array(buffer)
    for (let i = 0; i < binaryString.length; i++) {
      bufferView[i] = binaryString.charCodeAt(i)
    }
    const data = new Int16Array(buffer)
    this._samples = new Int16Array([...this._samples, ...data])
    this._allSamples = new Int16Array([...this._allSamples, ...data])
  }

  get url() {
    return createObjectURL(this._allSamples.buffer, {
      numChannels: this._options.channels,
      sampleRate: this._options.sampleRate,
    })
  }

  private flush() {
    if (!this._samples.length) {
      return
    }
    const bufferSource = this._audioCtx.createBufferSource()
    const length = this._samples.length / this._options.channels
    const audioBuffer = this._audioCtx.createBuffer(this._options.channels, length, this._options.sampleRate)

    for (let channel = 0; channel < this._options.channels; channel++) {
      const audioData = audioBuffer.getChannelData(channel)
      let offset = channel
      for (let i = 0; i < length; i++) {
        audioData[i] = this._samples[offset] / 32768
        offset += this._options.channels
      }
    }

    this._startTime = Math.max(this._startTime, this._audioCtx.currentTime)
    bufferSource.buffer = audioBuffer
    bufferSource.connect(this._gainNode)
    bufferSource.start(this._startTime)
    bufferSource.onended = () => {
      if (this._isDone && this._samples.length === 0 && this._startTime <= this._audioCtx.currentTime) {
        this.playButton.disabled = true
      }
    }
    this._startTime += audioBuffer.duration
    this._samples = new Int16Array(0)
  }

  async play() {
    await this._audioCtx.resume()
    this.playButton.innerHTML = '<i class="fa fa-pause"></i>'
    this._isPlaying = true
  }

  async pause() {
    await this._audioCtx.suspend()
    this.playButton.innerHTML = '<i class="fa fa-play"></i>'
    this._isPlaying = false
  }

  volume(volume: number) {
    this._gainNode.gain.value = volume
  }

  reset() {
    this._samples = new Int16Array(0)
    this._allSamples = new Int16Array(0)
    this.playButton.disabled = false
    this._isDone = false
    this.play()
  }

  destroy() {
    if (this._interval) {
      clearInterval(this._interval)
    }
    this._samples = new Int16Array(0)
    this._allSamples = new Int16Array(0)
    this._audioCtx.close()
  }
}

export default PCMPlayer
