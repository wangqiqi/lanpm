import type { ComponentType } from 'react'
import type { PluginView } from '@shared/plugin/types'
import ExampleStub from './builtins/ExampleStub'
import FormJsPoc from './builtins/FormJsPoc'

export type PluginSlotComponentProps = {
  plugin: PluginView
  groupId: string
  taskId: string
}

const REGISTRY: Record<string, ComponentType<PluginSlotComponentProps>> = {
  'lanpm.example': ExampleStub,
  'lanpm.formjs': FormJsPoc
}

export function resolvePluginComponent(
  pluginId: string
): ComponentType<PluginSlotComponentProps> | null {
  return REGISTRY[pluginId] ?? null
}
