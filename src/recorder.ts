// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

import merge from 'lodash/merge'
import { DOMWidgetModel, DOMWidgetView, ISerializers } from '@jupyter-widgets/base'

import { MODULE_NAME, MODULE_VERSION } from './version'
import WaveSurfer from './wavesurfer'

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
    }
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
  }

  static model_name = 'RecorderModel'
  static model_module = MODULE_NAME
  static model_module_version = MODULE_VERSION
  static view_name = 'RecorderView' // Set to null if no view
  static view_module = MODULE_NAME // Set to null if no view
  static view_module_version = MODULE_VERSION
}

export class RecorderView extends DOMWidgetView {
  private _recorder: WaveSurfer

  render() {
    super.render()
    this.displayed.then(async () => {
      this._recorder = WaveSurfer.create(
        merge({}, this.model.get('config'), {
          language: this.model.get('language'),
        }),
      )
      this.el.appendChild(this._recorder.el)
    })
  }
}
