/** 群组成员视图 — docs/04 §3.1 GroupMember（M2 简化） */
export interface GroupMemberView {
  userId: string
  displayName: string
  /** 用于 @提及匹配的可选别名（如 userId 短名） */
  mentionKeys?: string[]
}
