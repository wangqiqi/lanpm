import type { ComponentType } from 'react'
import type { PluginView } from '@shared/plugin/types'
import MindmapView from './builtins/MindmapView'

export type ContributedViewComponentProps = {
  plugin: PluginView
  groupId: string
}

const VIEW_REGISTRY: Record<string, ComponentType<ContributedViewComponentProps>> = {
  'lanpm.mindmap': MindmapView
}

export function resolveContributedViewComponent(
  pluginId: string
): ComponentType<ContributedViewComponentProps> | null {
  return VIEW_REGISTRY[pluginId] ?? null
}
