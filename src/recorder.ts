// Copyright (c) Zhendong Peng
// Distributed under the terms of the Modified BSD License.

import merge from 'lodash/merge'
import { DOMWidgetModel, DOMWidgetView, ISerializers } from '@jupyter-widgets/base'

import { MODULE_NAME, MODULE_VERSION } from './version'
import { AcknowledgedRecordingTransport } from './recording_transport'
import Recorder from './wavesurfer/recorder'

import 'bootstrap/dist/css/bootstrap.min.css'
import '../css/widget.css'

interface BackendMessage {
  msg_type: string
  sequence?: number
  message?: string
}

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
      rate: 16000,
      completed: true,
    }
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
  }

  static model_name = 'RecorderModel'
  static model_module = MODULE_NAME
  static model_module_version = MODULE_VERSION
  static view_name = 'RecorderView'
  static view_module = MODULE_NAME
  static view_module_version = MODULE_VERSION
}

export class RecorderView extends DOMWidgetView {
  private recorder: Recorder
  private transport: AcknowledgedRecordingTransport
  private pendingBlobReads: Promise<void> = Promise.resolve()

  render(): void {
    super.render()
    this.transport = new AcknowledgedRecordingTransport((message, buffers) => this.send(message, buffers))
    this.model.on('msg:custom', this.handleBackendMessage, this)

    void this.displayed.then(() => this.initializeRecorder()).catch((error: unknown) => this.reportError(error))
  }

  remove(): this {
    this.model.off('msg:custom', this.handleBackendMessage, this)
    this.transport.abort()
    this.recorder?.destroy()
    return super.remove() as this
  }

  private initializeRecorder(): void {
    const language = this.model.get('language')
    this.recorder = Recorder.create(
      merge({}, this.model.get('config'), { language }),
      merge({}, this.model.get('player_config'), { language }),
    )
    this.el.appendChild(this.recorder.el)

    this.recorder.onRecordStart(() => {
      this.pendingBlobReads = Promise.resolve()
      this.transport.start(this.recorder.sampleRate)
    })

    this.recorder.onRecordChunk((blob) => {
      if (!this.model.get('sync')) {
        return
      }
      this.pendingBlobReads = this.pendingBlobReads.then(async () => {
        const bytes = new Uint8Array(await blob.arrayBuffer())
        this.transport.enqueue(bytes)
      })
      this.pendingBlobReads.catch((error: unknown) => this.reportError(error))
    })

    this.recorder.onRecordEnd(async () => {
      await this.pendingBlobReads
      await this.transport.finish()
    })
  }

  private handleBackendMessage(message: BackendMessage): void {
    if (message.msg_type === 'recording_ack' && message.sequence !== undefined) {
      this.transport.acknowledge(message.sequence)
    } else if (message.msg_type === 'recording_finished_ack') {
      this.transport.acknowledgeFinished()
    } else if (message.msg_type === 'recording_error') {
      this.transport.fail(new Error(message.message ?? 'Recording transport failed'))
    }
  }

  private reportError(error: unknown): void {
    const normalizedError = error instanceof Error ? error : new Error(String(error))
    this.transport.fail(normalizedError)
    console.error('ipyaudio recorder:', normalizedError)
  }
}
