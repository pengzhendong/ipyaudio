// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

export class PCMPlayer {
  public button: HTMLButtonElement
  private _isDone: boolean = false
  private _isPlaying: boolean = true
  private _interval: number
  private _samples: Int16Array = new Int16Array(0)
  private _allSamples: Int16Array = new Int16Array(0)
  private _audioCtx: AudioContext
  private _gainNode: GainNode
  private _startTime: number
  private _options: { channels: number; sampleRate: number; flushTime: number }

  constructor(
    option?: Partial<{
      channels: number
      sampleRate: number
      flushTime: number
    }>,
  ) {
    this._options = Object.assign({ channels: 1, sampleRate: 16000, flushTime: 100 }, option)
    this.button = document.createElement('button')
    this.button.className = 'btn btn-danger me-3 my-3'
    this.button.innerHTML = '<i class="fa fa-pause"></i>'
    this.button.onclick = () => {
      this._isPlaying = !this._isPlaying
      this._isPlaying ? this.play() : this.pause()
      this.button.innerHTML = `<i class="fa fa-${this._isPlaying ? 'pause' : 'play'}"></i>`
    }

    this._interval = window.setInterval(this.flush.bind(this), this._options.flushTime)
    this._audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    this._gainNode = this._audioCtx.createGain()
    this._gainNode.gain.value = 1.0
    this._gainNode.connect(this._audioCtx.destination)
    this._startTime = this._audioCtx.currentTime
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

  getWavUrl() {
    const wavBytes = getWavBytes(this._allSamples.buffer, {
      isFloat: false,
      numChannels: this._options.channels,
      sampleRate: this._options.sampleRate,
    })
    return URL.createObjectURL(new Blob([wavBytes], { type: 'audio/wav' }))
  }

  private flush() {
    if (!this._samples.length) return
    const isDone = this._isDone
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
      this.button.disabled = isDone ? true : false
    }
    this._startTime += audioBuffer.duration
    this._samples = new Int16Array(0)
  }

  async play() {
    await this._audioCtx.resume()
  }

  async pause() {
    await this._audioCtx.suspend()
  }

  volume(volume: number) {
    this._gainNode.gain.value = volume
  }

  destroy() {
    if (this._interval) {
      clearInterval(this._interval)
    }
    this._samples = new Int16Array(0)
    this._audioCtx.close()
  }
}

function getWavHeader(options: {
  numFrames: number
  numChannels?: number
  sampleRate?: number
  isFloat?: boolean
}): Uint8Array {
  const numFrames = options.numFrames
  const numChannels = options.numChannels || 2
  const sampleRate = options.sampleRate || 44100
  const bytesPerSample = options.isFloat ? 4 : 2
  const format = options.isFloat ? 3 : 1
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numFrames * blockAlign
  const buffer = new ArrayBuffer(44)
  const dv = new DataView(buffer)
  let p = 0

  function writeString(s: string) {
    for (let i = 0; i < s.length; i++) {
      dv.setUint8(p + i, s.charCodeAt(i))
    }
    p += s.length
  }

  function writeUint32(d: number) {
    dv.setUint32(p, d, true)
    p += 4
  }

  function writeUint16(d: number) {
    dv.setUint16(p, d, true)
    p += 2
  }

  writeString('RIFF')
  writeUint32(dataSize + 36)
  writeString('WAVE')
  writeString('fmt ')
  writeUint32(16)
  writeUint16(format)
  writeUint16(numChannels)
  writeUint32(sampleRate)
  writeUint32(byteRate)
  writeUint16(blockAlign)
  writeUint16(bytesPerSample * 8)
  writeString('data')
  writeUint32(dataSize)

  return new Uint8Array(buffer)
}

function getWavBytes(
  buffer: ArrayBuffer,
  options: { isFloat: boolean; numChannels: number; sampleRate: number },
): Uint8Array {
  const type = options.isFloat ? Float32Array : Int16Array
  const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT
  const headerBytes = getWavHeader({ ...options, numFrames })
  const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength)
  wavBytes.set(headerBytes, 0)
  wavBytes.set(new Uint8Array(buffer), headerBytes.length)
  return wavBytes
}

export default PCMPlayer
