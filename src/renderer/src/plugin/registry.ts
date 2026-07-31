import type { ComponentType } from 'react'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import ExampleStub from './builtins/ExampleStub'
import FormJsPoc from './builtins/FormJsPoc'
import MeetingStub from './builtins/MeetingStub'

export type PluginSlotComponentProps = {
  plugin: PluginView
  groupId: string
  /** 任务级 Slot 可选；群级 Slot 不传 */
  taskId?: string
  context?: ViewPluginContext
}

const REGISTRY: Record<string, ComponentType<PluginSlotComponentProps>> = {
  'lanpm.example': ExampleStub,
  'lanpm.formjs': FormJsPoc,
  'lanpm.meeting': MeetingStub
}

export function resolvePluginComponent(
  pluginId: string
): ComponentType<PluginSlotComponentProps> | null {
  return REGISTRY[pluginId] ?? null
}
