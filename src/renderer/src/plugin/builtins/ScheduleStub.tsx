import { Typography } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
  context?: ViewPluginContext
}

/** `lanpm.schedule` — 甘特工具条宿主（许可 CTA / 关键路径在后续 TASK） */
export default function ScheduleStub({ plugin, context }: Props): React.ReactElement | null {
  if (context?.view !== 'gantt') return null

  return (
    <div
      className={styles.scheduleToolbar}
      data-testid="schedule-gantt-toolbar"
      data-plugin-id={plugin.id}
    >
      <Text type="secondary">{plugin.name}</Text>
    </div>
  )
}
