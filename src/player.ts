// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

import merge from 'lodash/merge'
import type * as Backbone from 'backbone'
import { DOMWidgetModel, DOMWidgetView, IBackboneModelOptions, ISerializers } from '@jupyter-widgets/base'

import { MODULE_NAME, MODULE_VERSION } from './version'
import Player from './wavesurfer/player'

// Import the CSS
import 'bootstrap/dist/css/bootstrap.min.css'

import '../css/widget.css'

interface PlayerMessage {
  msg_type: string
  is_streaming?: boolean
  message?: string
}

type PendingPlayerEvent = { type: 'message'; value: PlayerMessage } | { type: 'audio'; audio: string; rate: number }

export class PlayerModel extends DOMWidgetModel {
  private pendingEvents: PendingPlayerEvent[] = []
  private eventConsumer?: (event: PendingPlayerEvent) => void

  initialize(attributes: Backbone.ObjectHash, options: IBackboneModelOptions): void {
    super.initialize(attributes, options)
    this.on('msg:custom', this.captureMessage, this)
    this.on('change:audio', this.captureAudio, this)
  }

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

  setEventConsumer(consumer: (event: PendingPlayerEvent) => void): void {
    this.eventConsumer = consumer
    const pendingEvents = this.pendingEvents
    this.pendingEvents = []
    pendingEvents.forEach(consumer)
  }

  clearEventConsumer(consumer: (event: PendingPlayerEvent) => void): void {
    if (this.eventConsumer === consumer) {
      this.eventConsumer = undefined
    }
  }

  private captureMessage(message: PlayerMessage): void {
    this.captureEvent({ type: 'message', value: message })
  }

  private captureAudio(): void {
    this.captureEvent({
      type: 'audio',
      audio: this.get('audio'),
      rate: this.get('rate'),
    })
  }

  private captureEvent(event: PendingPlayerEvent): void {
    if (this.eventConsumer === undefined) {
      this.pendingEvents.push(event)
    } else {
      this.eventConsumer(event)
    }
  }
}

export class PlayerView extends DOMWidgetView {
  private player: Player
  private pendingEvents: PendingPlayerEvent[] = []
  private readonly consumeModelEvent = (event: PendingPlayerEvent) => this.enqueueOrDispatch(event)

  render(): void {
    super.render()
    ;(this.model as PlayerModel).setEventConsumer(this.consumeModelEvent)

    void this.displayed.then(() => {
      const config = { language: this.model.get('language') }
      this.player = Player.create(merge({}, this.model.get('config'), config))
      this.el.appendChild(this.player.el)
      const queuedEvents = this.pendingEvents
      this.pendingEvents = []
      queuedEvents.forEach((event) => this.dispatchEvent(event))
    })
  }

  remove(): this {
    ;(this.model as PlayerModel).clearEventConsumer(this.consumeModelEvent)
    this.pendingEvents = []
    this.player?.destroy()
    return super.remove() as this
  }

  private enqueueOrDispatch(event: PendingPlayerEvent): void {
    if (this.player === undefined) {
      this.pendingEvents.push(event)
      return
    }
    this.dispatchEvent(event)
  }

  private dispatchEvent(event: PendingPlayerEvent): void {
    if (event.type === 'audio') {
      this.player.sampleRate = event.rate
      void this.player.load(event.audio).catch((error: unknown) => console.error('ipyaudio player:', error))
      return
    }

    const message = event.value
    if (message.msg_type === 'reset') {
      this.player.reset(Boolean(message.is_streaming))
    } else if (message.msg_type === 'stream_finished') {
      void this.player.setDone().catch((error: unknown) => console.error('ipyaudio player:', error))
    } else if (message.msg_type === 'stream_error') {
      void this.player.setDone().catch((error: unknown) => console.error('ipyaudio player:', error))
      console.error('ipyaudio player stream:', message.message)
    } else if (message.msg_type === 'play') {
      void this.player.play().catch((error: unknown) => console.error('ipyaudio player:', error))
    } else if (message.msg_type === 'pause') {
      void this.player.pause().catch((error: unknown) => console.error('ipyaudio player:', error))
    }
  }
}
