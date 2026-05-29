import type { GroupType } from '../navigation/types'

/** 启动时自动注入的演示群（固定 groupId，便于测试与解散） */
export const MOCK_CATALOG_VERSION = '3'

export interface MockGroupDef {
  groupId: string
  name: string
  type: GroupType
}

export const MOCK_GROUPS: MockGroupDef[] = [
  { groupId: 'demo-project', name: '示例项目 · LanPM', type: 'project' },
  { groupId: 'demo-function', name: '示例职能群 · 协作', type: 'function' },
  { groupId: 'demo-anonymous', name: '示例匿名群 · 讨论', type: 'anonymous' }
]

export function isMockGroupId(groupId: string): boolean {
  return groupId.startsWith('demo-')
}
