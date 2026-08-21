import { Typography } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
  taskId?: string
  context?: ViewPluginContext
}

/** `lanpm.agile` — 看板槽宿主（许可 CTA / 故事点在后续 TASK） */
export default function AgileStub({ plugin, context }: Props): React.ReactElement | null {
  if (context?.view !== 'board') return null
  if (context.zone === 'card') return null

  return (
    <div
      className={styles.scheduleToolbar}
      data-testid="agile-board-toolbar"
      data-plugin-id={plugin.id}
    >
      <Text type="secondary">{plugin.name}</Text>
    </div>
  )
}
