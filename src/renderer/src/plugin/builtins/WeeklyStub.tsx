import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'

interface Props {
  plugin: PluginView
  groupId: string
  taskId?: string
  context?: ViewPluginContext
}

/** `lanpm.weekly` — 驾驶舱周报/月报导出走 Host IPC 闸；本 Slot 不挂 UI */
export default function WeeklyStub(_props: Props): React.ReactElement | null {
  return null
}
