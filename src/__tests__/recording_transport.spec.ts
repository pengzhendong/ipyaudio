// Copyright (c) Zhendong Peng.
// Distributed under the terms of the Modified BSD License.

import { AcknowledgedRecordingTransport, RecordingMessage } from '../recording_transport'

describe('AcknowledgedRecordingTransport', () => {
  it('keeps one chunk in flight and preserves order', async () => {
    const messages: RecordingMessage[] = []
    const buffers: ArrayBufferView[][] = []
    const transport = new AcknowledgedRecordingTransport((message, sentBuffers = []) => {
      messages.push(message)
      buffers.push(sentBuffers)
    })

    transport.start(16000)
    transport.enqueue(new Uint8Array([1, 2]))
    transport.enqueue(new Uint8Array([3]))

    expect(messages.map((message) => message.msg_type)).toEqual(['recording_started', 'recording_chunk'])
    expect(Array.from(buffers[1][0] as Uint8Array)).toEqual([1, 2])

    transport.acknowledge(0)
    expect(messages[2]).toEqual({ msg_type: 'recording_chunk', sequence: 1 })
    expect(Array.from(buffers[2][0] as Uint8Array)).toEqual([3])

    const finished = transport.finish()
    transport.acknowledge(1)
    expect(messages[3]).toEqual({ msg_type: 'recording_finished' })
    transport.acknowledgeFinished()
    await expect(finished).resolves.toBeUndefined()
  })

  it('rejects completion when an invalid acknowledgement arrives', async () => {
    const transport = new AcknowledgedRecordingTransport(() => undefined)
    transport.start(48000)
    transport.enqueue(new Uint8Array([1]))
    const finished = transport.finish()

    transport.acknowledge(9)

    await expect(finished).rejects.toThrow('Unexpected recording acknowledgement 9')
  })
})
