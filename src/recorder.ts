// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

import merge from 'lodash/merge'
import { simplearray_serialization } from 'jupyter-dataserializers'
import { DOMWidgetModel, DOMWidgetView, ISerializers } from '@jupyter-widgets/base'

import { MODULE_NAME, MODULE_VERSION } from './version'
import ChunkQueue from './chunk_queue'
import Recorder from './wavesurfer/recorder'

// Import the CSS
import 'bootstrap/dist/css/bootstrap.min.css'

import '../css/widget.css'

export class RecorderModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: RecorderModel.model_name,
      _model_module: RecorderModel.model_module,
      _model_module_version: RecorderModel.model_module_version,
      _view_name: RecorderModel.view_name,
      _view_module: RecorderModel.view_module,
      _view_module_version: RecorderModel.view_module_version,

      chunk: new Uint8Array(0),
      rate: 16000,
      end: false,
    }
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
    chunk: simplearray_serialization as any,
  }

  static model_name = 'RecorderModel'
  static model_module = MODULE_NAME
  static model_module_version = MODULE_VERSION
  static view_name = 'RecorderView' // Set to null if no view
  static view_module = MODULE_NAME // Set to null if no view
  static view_module_version = MODULE_VERSION
}

export class RecorderView extends DOMWidgetView {
  private _recorder: Recorder
  private _chunks: ChunkQueue = new ChunkQueue()
  private _isFirstChunk = true
  private _isCompleted = false

  private async _sendChunk() {
    // 1 seconds maximum wait time
    const chunk = await this._chunks.dequeue(1000 + (this._recorder.timeSlice ?? 20))
    if (chunk.length > 0) {
      this.model.set('chunk', { array: chunk, shape: [chunk.length] })
      this.model.save_changes()
    }
    if (this._isCompleted) {
      this.model.set('completed', true)
      this.model.save_changes()
    }
  }

  render() {
    super.render()
    this.displayed.then(async () => {
      const language = this.model.get('language')
      this._recorder = Recorder.create(
        merge({}, this.model.get('config'), { language }),
        merge({}, this.model.get('player_config'), { language }),
      )
      this.el.appendChild(this._recorder.el)

      this.model.on('msg:custom', async (msg: any) => {
        if (msg.msg_type === 'chunk_received') {
          this._sendChunk()
        }
      })

      this._recorder.onRecordStart(() => {
        this._isCompleted = false
        this._isFirstChunk = true
        this.model.set('completed', false)
        this.model.set('rate', this._recorder.sampleRate)
        this.model.save_changes()
      })

      this._recorder.onRecordChunk(async (blob) => {
        this._chunks.enqueue(new Uint8Array(await blob.arrayBuffer()))
        if (this.model.get('sync') && this._isFirstChunk) {
          this._isFirstChunk = false
          this._sendChunk()
        }
      })

      this._recorder.onRecordEnd(async (blob) => {
        this._isCompleted = true
        if (!this.model.get('sync')) {
          this.model.set('completed', true)
          this.model.save_changes()
        }
      })
    })
  }
}
