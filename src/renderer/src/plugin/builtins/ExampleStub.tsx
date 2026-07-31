import { useCallback, useState } from 'react'
import { Button, Typography, message } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import type { Task } from '@shared/task/types'
import type { ChatMessagePage } from '@shared/chat/pagination'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import { invokeCapabilityWithHumanConfirm } from '@renderer/plugin/invokeCapabilityWithHumanConfirm'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
  taskId?: string
  context?: ViewPluginContext
}

function ExampleTaskSection({ plugin, taskId }: Props): React.ReactElement {
  const { t } = useI18n()
  const label = taskId ?? '—'
  return (
    <div className={styles.card} data-plugin-id={plugin.id}>
      <div className={styles.cardHeader}>
        <Text strong>{plugin.name}</Text>
        <span className={styles.badge}>{t('plugin.pricingFree')}</span>
      </div>
      <Text type="secondary">{t('plugin.exampleHint', { taskId: label })}</Text>
    </div>
  )
}

function ExampleComposerAction({ plugin, groupId }: Props): React.ReactElement {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)

  const confirmCopy = useCallback(
    (capability: string) => ({
      title: t('plugin.confirmWriteTitle'),
      content: t('plugin.confirmWriteBody', { capability }),
      okText: t('plugin.confirmWriteOk'),
      cancelText: t('plugin.confirmWriteCancel')
    }),
    [t]
  )

  const onSendTaskRef = useCallback(async () => {
    setBusy(true)
    try {
      const tasks = (await getLanpmApi().plugin.invokeCapability(plugin.id, 'task.list', {
        groupId
      })) as Task[]
      const first = tasks.find((task) => !task.deletedAt)
      if (!first) {
        message.info(t('plugin.exampleNoTasks'))
        return
      }
      await getLanpmApi().plugin.invokeCapability(plugin.id, 'chat.sendTaskRef', {
        groupId,
        taskId: first.taskId
      })
      message.success(t('plugin.exampleTaskRefSent', { title: first.title }))
    } catch (err: unknown) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    } finally {
      setBusy(false)
    }
  }, [groupId, plugin.id, t])

  const onPatchFirstTask = useCallback(async () => {
    setBusy(true)
    try {
      const tasks = (await getLanpmApi().plugin.invokeCapability(plugin.id, 'task.list', {
        groupId
      })) as Task[]
      const first = tasks.find((task) => !task.deletedAt)
      if (!first) {
        message.info(t('plugin.exampleNoTasks'))
        return
      }
      const nextProgress = Math.min(100, (first.progressPercent ?? 0) + 5)
      const updated = (await invokeCapabilityWithHumanConfirm(
        plugin.id,
        'task.patch',
        {
          groupId,
          taskId: first.taskId,
          patch: { progressPercent: nextProgress }
        },
        confirmCopy('task.patch')
      )) as Task | null
      if (!updated) return
      message.success(t('plugin.exampleTaskPatched', { percent: updated.progressPercent ?? 0 }))
    } catch (err: unknown) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    } finally {
      setBusy(false)
    }
  }, [confirmCopy, groupId, plugin.id, t])

  const onCreateTask = useCallback(async () => {
    setBusy(true)
    try {
      const title = t('plugin.exampleCreateTaskTitle')
      const created = (await invokeCapabilityWithHumanConfirm(
        plugin.id,
        'task.create',
        { groupId, title, priority: 'medium' },
        confirmCopy('task.create')
      )) as Task | null
      if (!created) return
      message.success(t('plugin.exampleTaskCreated', { title: created.title }))
    } catch (err: unknown) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    } finally {
      setBusy(false)
    }
  }, [confirmCopy, groupId, plugin.id, t])

  const onProbeRead = useCallback(async () => {
    setBusy(true)
    try {
      const page = (await getLanpmApi().plugin.invokeCapability(plugin.id, 'chat.listMessages', {
        groupId
      })) as ChatMessagePage
      const members = await getLanpmApi().plugin.invokeCapability(plugin.id, 'member.list', {
        groupId
      })
      const memberCount = Array.isArray(members) ? members.length : 0
      message.info(
        t('plugin.exampleReadProbe', {
          messages: page.messages.length,
          members: memberCount
        })
      )
    } catch (err: unknown) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    } finally {
      setBusy(false)
    }
  }, [groupId, plugin.id, t])

  return (
    <div className={styles.composerAction} data-plugin-id={plugin.id}>
      <Button size="small" loading={busy} onClick={() => void onProbeRead()}>
        {t('plugin.exampleProbeRead')}
      </Button>
      <Button size="small" loading={busy} onClick={() => void onCreateTask()}>
        {t('plugin.exampleCreateTask')}
      </Button>
      <Button size="small" loading={busy} onClick={() => void onPatchFirstTask()}>
        {t('plugin.examplePatchTask')}
      </Button>
      <Button size="small" type="primary" loading={busy} onClick={() => void onSendTaskRef()}>
        {t('plugin.exampleSendTaskRef')}
      </Button>
    </div>
  )
}

function ExampleProfileTab({ plugin }: Props): React.ReactElement {
  const { t } = useI18n()
  return (
    <div className={styles.card} data-plugin-id={plugin.id}>
      <Text type="secondary">{t('plugin.exampleProfileTab')}</Text>
    </div>
  )
}

/** 免费官方 stub — Host→Slot + Extension API v0.4 人审演示 */
export default function ExampleStub(props: Props): React.ReactElement | null {
  if (props.context?.view === 'profile') {
    return <ExampleProfileTab {...props} />
  }
  if (props.context?.view === 'chat' && !props.taskId) {
    if (props.context.zone !== 'composer') return null
    return <ExampleComposerAction {...props} />
  }
  return <ExampleTaskSection {...props} />
}
