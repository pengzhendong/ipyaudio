// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

export type RecordingMessage =
  | { msg_type: 'recording_started'; rate: number }
  | { msg_type: 'recording_chunk'; sequence: number }
  | { msg_type: 'recording_finished' }

export type RecordingMessageSender = (message: RecordingMessage, buffers?: ArrayBufferView[]) => void

interface PendingChunk {
  sequence: number
  data: Uint8Array
}

/**
 * Serializes recording chunks over a fire-and-forget comm.
 *
 * Sending itself cannot be awaited, so this transport keeps exactly one chunk
 * in flight and advances only after the Python side acknowledges its sequence.
 */
export class AcknowledgedRecordingTransport {
  private readonly send: RecordingMessageSender
  private queue: PendingChunk[] = []
  private nextSequence = 0
  private inFlightSequence: number | null = null
  private active = false
  private finishing = false
  private finishedMessageSent = false
  private failure: Error | null = null
  private finishPromise: Promise<void> | null = null
  private resolveFinish: (() => void) | null = null
  private rejectFinish: ((error: Error) => void) | null = null

  constructor(send: RecordingMessageSender) {
    this.send = send
  }

  start(rate: number): void {
    if (this.active) {
      this.abort(new Error('A new recording started before the previous recording finished'))
    }
    this.queue = []
    this.nextSequence = 0
    this.inFlightSequence = null
    this.active = true
    this.finishing = false
    this.finishedMessageSent = false
    this.failure = null
    this.finishPromise = null
    this.resolveFinish = null
    this.rejectFinish = null
    this.send({ msg_type: 'recording_started', rate })
  }

  enqueue(data: Uint8Array): void {
    if (!this.active || this.finishing) {
      throw new Error('Cannot enqueue a chunk outside an active recording')
    }
    if (data.byteLength === 0) {
      return
    }
    this.queue.push({ sequence: this.nextSequence, data })
    this.nextSequence += 1
    this.pump()
  }

  acknowledge(sequence: number): void {
    if (sequence !== this.inFlightSequence || this.queue[0]?.sequence !== sequence) {
      this.fail(new Error(`Unexpected recording acknowledgement ${sequence}`))
      return
    }
    this.queue.shift()
    this.inFlightSequence = null
    this.pump()
  }

  finish(): Promise<void> {
    if (!this.active) {
      return Promise.reject(this.failure ?? new Error('No active recording to finish'))
    }
    if (!this.finishPromise) {
      this.finishing = true
      this.finishPromise = new Promise<void>((resolve, reject) => {
        this.resolveFinish = resolve
        this.rejectFinish = reject
      })
      this.pump()
    }
    return this.finishPromise
  }

  acknowledgeFinished(): void {
    if (!this.finishedMessageSent) {
      this.fail(new Error('Received a finish acknowledgement before all chunks were delivered'))
      return
    }
    this.active = false
    this.resolveFinish?.()
    this.resolveFinish = null
    this.rejectFinish = null
  }

  fail(error: Error): void {
    this.failure = error
    this.active = false
    this.queue = []
    this.inFlightSequence = null
    this.rejectFinish?.(error)
    this.resolveFinish = null
    this.rejectFinish = null
  }

  abort(error: Error = new Error('Recording transport was closed')): void {
    this.fail(error)
  }

  private pump(): void {
    if (!this.active || this.failure || this.inFlightSequence !== null) {
      return
    }
    const next = this.queue[0]
    if (next) {
      this.inFlightSequence = next.sequence
      this.send({ msg_type: 'recording_chunk', sequence: next.sequence }, [next.data])
      return
    }
    if (this.finishing && !this.finishedMessageSent) {
      this.finishedMessageSent = true
      this.send({ msg_type: 'recording_finished' })
    }
  }
}
