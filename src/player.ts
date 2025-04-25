// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

import merge from 'lodash/merge'
import { DOMWidgetModel, DOMWidgetView, ISerializers } from '@jupyter-widgets/base'

import { MODULE_NAME, MODULE_VERSION } from './version'
import Player from './wavesurfer/player'

// Import the CSS
import 'bootstrap/dist/css/bootstrap.min.css'

import '../css/widget.css'

export class PlayerModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: PlayerModel.model_name,
      _model_module: PlayerModel.model_module,
      _model_module_version: PlayerModel.model_module_version,
      _view_name: PlayerModel.view_name,
      _view_module: PlayerModel.view_module,
      _view_module_version: PlayerModel.view_module_version,
    }
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
  }

  static model_name = 'PlayerModel'
  static model_module = MODULE_NAME
  static model_module_version = MODULE_VERSION
  static view_name = 'PlayerView' // Set to null if no view
  static view_module = MODULE_NAME // Set to null if no view
  static view_module_version = MODULE_VERSION
}

export class PlayerView extends DOMWidgetView {
  private _player: Player

  render() {
    super.render()
    this.displayed.then(async () => {
      const config = {
        isStreaming: this.model.get('is_streaming'),
        language: this.model.get('language'),
      }
      this._player = Player.create(merge({}, this.model.get('config'), config))
      this.el.appendChild(this._player.el)
      this.model.on('change:audio', () => {
        this._player.sampleRate = this.model.get('rate')
        this._player.load(this.model.get('audio'))
      })
      this.model.on('change:is_done', () => {
        this._player.setDone()
      })
      this.model.on('msg:custom', async (msg: any) => {
        if (msg.msg_type === 'play') {
          this._player.play()
        } else if (msg.msg_type === 'pause') {
          this._player.pause()
        }
      })
    })
  }
}
