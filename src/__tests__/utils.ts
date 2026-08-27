// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as widgets from '@jupyter-widgets/base'

export interface Constructor<T> {
  new (attributes?: any, options?: any): T
}

export function createTestModel<T extends widgets.WidgetModel>(constructor: Constructor<T>, attributes?: any): T {
  const manager = {
    callbacks: () => ({}),
  } as unknown as widgets.IWidgetManager
  return new constructor(attributes, {
    widget_manager: manager,
    model_id: widgets.uuid(),
  })
}
