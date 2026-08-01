import { useEffect, useState } from 'react'
import { Typography, message } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { Task } from '@shared/task/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
  showInstallHint?: boolean
}

/** mind-elixir 未安装时的最小思维导图占位（任务树只读） */
export default function MindmapStub({
  plugin,
  groupId,
  showInstallHint
}: Props): React.ReactElement {
  const { t } = useI18n()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getLanpmApi()
      .plugin.invokeCapability(plugin.id, 'task.list', { groupId })
      .then((raw) => {
        if (!cancelled) setTasks((raw as Task[]) ?? [])
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [plugin.id, groupId, t])

  return (
    <div
      className={styles.card}
      data-plugin-id={plugin.id}
      data-mindmap-engine="stub"
      data-mindmap-ready={loading ? '0' : '1'}
    >
      <div className={styles.cardHeader}>
        <Text strong>{plugin.name}</Text>
        <span className={styles.badge}>{t('plugin.pricingPaid')}</span>
      </div>
      {showInstallHint ? (
        <Text type="secondary">{t('plugin.mindmapInstallHint')}</Text>
      ) : (
        <Text type="secondary">{t('plugin.mindmapStubHint')}</Text>
      )}
      {loading ? (
        <Text type="secondary">{t('plugin.formLoading')}</Text>
      ) : (
        <ul className={styles.mindmapStubList}>
          {tasks.length === 0 ? (
            <li>
              <Text type="secondary">{t('plugin.mindmapEmpty')}</Text>
            </li>
          ) : (
            tasks.slice(0, 12).map((task) => (
              <li key={task.taskId}>
                <Text>{task.title}</Text>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
