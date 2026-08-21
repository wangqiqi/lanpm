import type { ComponentType } from 'react'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import ExampleStub from './builtins/ExampleStub'
import MeetingStub from './builtins/MeetingStub'
import OpsStub from './builtins/OpsStub'
import MindmapSlot from './builtins/MindmapSlot'
import AiAssistantStub from './builtins/AiAssistantStub'
import ScheduleStub from './builtins/ScheduleStub'
import AgileStub from './builtins/AgileStub'
import WeeklyStub from './builtins/WeeklyStub'

export type PluginSlotComponentProps = {
  plugin: PluginView
  groupId: string
  /** 任务级 Slot 可选；群级 Slot 不传 */
  taskId?: string
  context?: ViewPluginContext
}

const REGISTRY: Record<string, ComponentType<PluginSlotComponentProps>> = {
  'lanpm.example': ExampleStub,
  'lanpm.meeting': MeetingStub,
  'lanpm.ops': OpsStub,
  'lanpm.mindmap': MindmapSlot,
  'lanpm.ai-assistant': AiAssistantStub,
  'lanpm.schedule': ScheduleStub,
  'lanpm.agile': AgileStub,
  'lanpm.weekly': WeeklyStub
}

export function resolvePluginComponent(
  pluginId: string
): ComponentType<PluginSlotComponentProps> | null {
  return REGISTRY[pluginId] ?? null
}
