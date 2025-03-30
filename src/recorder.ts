// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

import merge from 'lodash/merge'
import { simplearray_serialization } from 'jupyter-dataserializers'
import { DOMWidgetModel, DOMWidgetView, ISerializers } from '@jupyter-widgets/base'

import { MODULE_NAME, MODULE_VERSION } from './version'
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

  render() {
    super.render()
    this.displayed.then(async () => {
      const language = this.model.get('language')
      this._recorder = Recorder.create(
        merge({}, this.model.get('config'), { language }),
        merge({}, this.model.get('player_config'), { language }),
      )
      this.el.appendChild(this._recorder.el)
      this._recorder.onRecordStart(() => {
        this.model.set('end', false)
        this.model.set('rate', this._recorder.sampleRate)
        this.model.save_changes()
      })
      this._recorder.onRecordChunk(async (blob) => {
        const arrayBuffer = await blob.arrayBuffer()
        const audioData = new Uint8Array(arrayBuffer)
        this.model.set('chunk', {
          array: audioData,
          shape: [audioData.length],
        })
        this.model.save_changes()
      })
      this._recorder.onRecordEnd(async (blob) => {
        this.model.set('end', true)
        this.model.save_changes()
      })
    })
  }
}
