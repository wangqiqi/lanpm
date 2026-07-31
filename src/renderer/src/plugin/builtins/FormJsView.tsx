import { useEffect, useRef, useState } from 'react'
import { Button, Typography, message } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { Task } from '@shared/task/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import FormJsPoc from './FormJsPoc'
import {
  loadFormJsClient,
  loadFormJsStyles,
  type FormJsClientModule,
  type FormJsFormInstance
} from './formJsClientLoader'
import { FORMJS_DEMO_SCHEMA, resolveFormJsSchemaLabels } from './formJsSchema'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
  taskId?: string
}

/**
 * form-js 真库渲染；`@bpmn-io/form-js` 未安装时降级为 `FormJsPoc`。
 */
export default function FormJsView({ plugin, groupId, taskId }: Props): React.ReactElement {
  const { t } = useI18n()
  const resolvedTaskId = taskId ?? ''
  const containerRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<FormJsFormInstance | null>(null)
  const [sdk, setSdk] = useState<FormJsClientModule | null | undefined>(undefined)
  const [taskTitle, setTaskTitle] = useState('')
  const [loadingTask, setLoadingTask] = useState(true)
  const [formReady, setFormReady] = useState(false)
  const [initialData, setInitialData] = useState<Record<string, unknown>>({})

  useEffect(() => {
    let cancelled = false
    void loadFormJsClient().then((mod) => {
      if (!cancelled) setSdk(mod)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoadingTask(true)
    void getLanpmApi()
      .plugin.invokeCapability(plugin.id, 'task.get', { taskId: resolvedTaskId })
      .then((raw) => {
        if (cancelled) return
        const task = raw as Task | null
        const title = task?.title ?? ''
        setTaskTitle(title)
        setInitialData({ summary: title })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTask(false)
      })
    return () => {
      cancelled = true
    }
  }, [plugin.id, resolvedTaskId, t])

  useEffect(() => {
    if (sdk === undefined || sdk === null || loadingTask) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    setFormReady(false)

    void (async () => {
      await loadFormJsStyles()
      if (cancelled) return
      formRef.current?.destroy()
      const form = new sdk.Form({ container })
      formRef.current = form
      const schema = resolveFormJsSchemaLabels(FORMJS_DEMO_SCHEMA, t)
      await form.importSchema(schema, initialData)
      if (!cancelled) setFormReady(true)
    })().catch((err: unknown) => {
      if (!cancelled) {
        message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
      }
    })

    return () => {
      cancelled = true
      formRef.current?.destroy()
      formRef.current = null
    }
  }, [sdk, loadingTask, initialData, t])

  if (sdk === undefined || loadingTask) {
    return (
      <div className={styles.card} data-plugin-id={plugin.id}>
        <Text type="secondary">{t('plugin.formLoading')}</Text>
      </div>
    )
  }

  if (sdk === null) {
    return <FormJsPoc plugin={plugin} groupId={groupId} taskId={resolvedTaskId} showInstallHint />
  }

  return (
    <div className={styles.card} data-plugin-id={plugin.id} data-formjs-engine="bpmn">
      <div className={styles.cardHeader}>
        <Text strong>{plugin.name}</Text>
        <span className={styles.badge}>{t('plugin.pricingPaid')}</span>
      </div>
      <Text type="secondary">
        {formReady
          ? t('plugin.formHint', { title: taskTitle || resolvedTaskId })
          : t('plugin.formLoading')}
      </Text>
      <div ref={containerRef} className={styles.formJsHost} data-formjs-container />
      <div className={styles.formActions}>
        <Button
          size="small"
          type="primary"
          onClick={() => {
            message.success(t('plugin.formSavedLocal'))
          }}
        >
          {t('plugin.formSave')}
        </Button>
      </div>
    </div>
  )
}
