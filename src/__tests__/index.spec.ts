// Copyright (c) Zhendong Peng.
// Distributed under the terms of the Modified BSD License.

import { createTestModel } from './utils'
import { PlayerModel, RecorderModel } from '..'

describe('widget models', () => {
  it('creates a player model', () => {
    const model = createTestModel(PlayerModel)
    expect(model).toBeInstanceOf(PlayerModel)
  })

  it('preserves player events until a view starts consuming them', () => {
    const model = createTestModel(PlayerModel)
    model.trigger('msg:custom', { msg_type: 'reset', is_streaming: true })
    model.set({ rate: 8000, audio: 'first-chunk' })

    const events: unknown[] = []
    model.setEventConsumer((event) => events.push(event))
    model.set('audio', 'second-chunk')

    expect(events).toEqual([
      { type: 'message', value: { msg_type: 'reset', is_streaming: true } },
      { type: 'audio', audio: 'first-chunk', rate: 8000 },
      { type: 'audio', audio: 'second-chunk', rate: 8000 },
    ])
  })

  it('creates a recorder model with explicit state defaults', () => {
    const model = createTestModel(RecorderModel)
    expect(model).toBeInstanceOf(RecorderModel)
    expect(model.get('rate')).toBe(16000)
    expect(model.get('completed')).toBe(true)
  })
})
