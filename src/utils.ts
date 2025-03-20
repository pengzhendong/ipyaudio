// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

export const createElement = <T extends HTMLElement>(
  tagName: keyof HTMLElementTagNameMap,
  className: string,
  innerHTML: string = '',
): T => {
  const element = document.createElement(tagName) as T
  element.className = className
  element.innerHTML = innerHTML
  return element
}

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const secondsRemainder = Math.round(seconds) % 60
  const paddedSeconds = `0${secondsRemainder}`.slice(-2)
  return `${minutes}:${paddedSeconds}`
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
  const bytesPerSample = options.isFloat? 4 : 2
  const format = options.isFloat? 3 : 1
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
  writeString('RIFF')              // ChunkID
  writeUint32(dataSize + 36)       // ChunkSize
  writeString('WAVE')              // Format
  writeString('fmt ')              // Subchunk1ID
  writeUint32(16)                  // Subchunk1Size
  writeUint16(format)              // AudioFormat https://i.stack.imgur.com/BuSmb.png
  writeUint16(numChannels)         // NumChannels
  writeUint32(sampleRate)          // SampleRate
  writeUint32(byteRate)            // ByteRate
  writeUint16(blockAlign)          // BlockAlign
  writeUint16(bytesPerSample * 8)  // BitsPerSample
  writeString('data')              // Subchunk2ID
  writeUint32(dataSize)            // Subchunk2Size
  return new Uint8Array(buffer)
}

function interleaveChannels(buffer: AudioBuffer): Int16Array {
  const { numberOfChannels, length } = buffer
  const pcmData = new Int16Array(length * numberOfChannels)
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel)
    const isFloat = data instanceof Float32Array
    for (let i = 0; i < length; i++) {
      // convert float32 to int16
      pcmData[i * numberOfChannels + channel] = isFloat ? data[i] * 32767 : data[i]
    }
  }
  return pcmData
}

function getWavBytes(
  buffer: ArrayBuffer | AudioBuffer | null,
  options: { numChannels: number; sampleRate: number },
): Uint8Array {
  if (!buffer) {
    return new Uint8Array()
  }

  let headerBytes: Uint8Array
  let pcmData: Uint8Array

  if (buffer instanceof ArrayBuffer) {
    headerBytes = getWavHeader({
      isFloat: false,
      numChannels: options.numChannels,
      sampleRate: options.sampleRate,
      numFrames: buffer.byteLength / Int16Array.BYTES_PER_ELEMENT,
    })
    pcmData = new Uint8Array(buffer)
  } else {
    headerBytes = getWavHeader({
      isFloat: false,
      numChannels: buffer.numberOfChannels,
      sampleRate: buffer.sampleRate,
      numFrames: buffer.length,
    })
    pcmData = new Uint8Array(interleaveChannels(buffer).buffer)
  }
  const wavBytes = new Uint8Array(headerBytes.length + pcmData.length)
  wavBytes.set(headerBytes, 0)
  wavBytes.set(pcmData, headerBytes.length)

  return wavBytes
}

export const createObjectURL = (
  buffer: ArrayBuffer | AudioBuffer | null,
  options: { numChannels: number; sampleRate: number } = {
    numChannels: 1,
    sampleRate: 44100,
  },
): string => {
  let wavBytes: Uint8Array

  if (buffer instanceof AudioBuffer) {
    wavBytes = getWavBytes(buffer, {
      numChannels: buffer.numberOfChannels,
      sampleRate: buffer.sampleRate,
    })
  } else {
    wavBytes = getWavBytes(buffer, options)
  }

  return URL.createObjectURL(new Blob([wavBytes], { type: 'audio/wav' }))
}
