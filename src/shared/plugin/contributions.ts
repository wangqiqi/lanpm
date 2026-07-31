import type { GroupType } from '../navigation/types.ts'

/** manifest `contributions.views[]` 单项 */
export type PluginContributionView = {
  /** 插件内稳定视图 id */
  id: string
  /** URL 段；深链 `/g/:groupId/:route` */
  route: string
  /** i18n 键，如 `nav.mindmap` */
  titleKey: string
  icon?: string
  groupTypes?: GroupType[]
  pricing?: 'free' | 'paid'
}

/** 发现阶段扁平化后的贡献视图（Renderer / IPC） */
export type ContributedPluginView = PluginContributionView & {
  pluginId: string
  dirName: string
  enabled: boolean
  groupTypes: GroupType[]
  pricing: 'free' | 'paid'
}

/** 主轴保留路由 — contributions.views[].route 不可占用 */
export const RESERVED_CONTRIBUTION_ROUTES = new Set([
  'chat',
  'board',
  'tree',
  'gantt',
  'calendar',
  'whiteboard',
  'files',
  'cockpit'
])

export function isReservedContributionRoute(route: string): boolean {
  return RESERVED_CONTRIBUTION_ROUTES.has(route)
}

export function defaultContributionGroupTypes(): GroupType[] {
  return ['project']
}
