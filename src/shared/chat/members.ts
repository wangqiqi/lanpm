/** 群组成员视图 — docs/04 §3.1 GroupMember（M2 简化） */
import type { UserPresence } from '../network/types'

export interface GroupMemberView {
  userId: string
  displayName: string
  /** 本地已知头像（data URL / 路径）；缺省由 UI 用确定性色块兜底 */
  avatarUrl?: string
  /** 用于 @提及匹配的可选别名（如 userId 短名） */
  mentionKeys?: string[]
  /** 按 userId 聚合的在线态（M2-05） */
  presence?: UserPresence
}
