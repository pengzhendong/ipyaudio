// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Add any needed widget imports here (or from controls)
// import {} from '@jupyter-widgets/base';

import { createTestModel } from './utils'

import { PlayerModel, RecorderModel } from '..'

describe('Player', () => {
  describe('PlayerModel', () => {
    it('should be createable with a value', () => {
      const state = { audio: 'https://modelscope.cn/datasets/pengzhendong/filesamples/resolve/master/audio/aac/sample1.aac' }
      const model = createTestModel(PlayerModel, state)
      expect(model).toBeInstanceOf(PlayerModel)
      expect(model.get('rate')).toEqual(16000)
    })
  })
})

describe('Recorder', () => {
  describe('RecorderModel', () => {
    it('should be createable', () => {
      const model = createTestModel(RecorderModel)
      expect(model).toBeInstanceOf(RecorderModel)
      expect(model.get('sync')).toEqual(false)
    })
    it('should be createable with a filename', () => {
      const model = createTestModel(RecorderModel, { filename: 'audio.wav' })
      expect(model).toBeInstanceOf(RecorderModel)
      expect(model.get('sync')).toEqual(true)
    })
  })
})
