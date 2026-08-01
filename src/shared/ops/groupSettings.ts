/** 群级 Ops 功能开关（默认关） */
export type OpsGroupSettings = {
  groupId: string
  assistantEnabled: boolean
  watchEnabled: boolean
}

export type OpsGroupSettingsPatch = {
  assistantEnabled?: boolean
  watchEnabled?: boolean
}

export const DEFAULT_OPS_GROUP_SETTINGS = (groupId: string): OpsGroupSettings => ({
  groupId,
  assistantEnabled: false,
  watchEnabled: false
})
