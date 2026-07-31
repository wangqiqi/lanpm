import { useEffect, useState } from 'react'
import { Button, Checkbox, Input, Typography, message } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { Task } from '@shared/task/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import { FORMJS_DEMO_SCHEMA } from './formJsSchema'
import styles from '../plugin.module.css'

const { Text } = Typography
const { TextArea } = Input

interface Props {
  plugin: PluginView
  groupId: string
  taskId?: string
  /** 真库未安装时由 FormJsView 传入 */
  showInstallHint?: boolean
}

/**
 * form-js POC：form-js 风格 schema 的最小渲染器（不引入核心 @bpmn-io/form-js 依赖）。
 * 经 Host `task.get` 预填标题。
 */
export default function FormJsPoc({ plugin, taskId, showInstallHint }: Props): React.ReactElement {
  const { t } = useI18n()
  const resolvedTaskId = taskId ?? ''
  const [taskTitle, setTaskTitle] = useState('')
  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [loading, setLoading] = useState(true)

  const components = FORMJS_DEMO_SCHEMA.components as ReadonlyArray<{
    key: string
    labelKey: string
    type: string
  }>

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getLanpmApi()
      .plugin.invokeCapability(plugin.id, 'task.get', { taskId: resolvedTaskId })
      .then((raw) => {
        if (cancelled) return
        const task = raw as Task | null
        const title = task?.title ?? ''
        setTaskTitle(title)
        setValues((prev) => ({
          ...prev,
          summary: typeof prev.summary === 'string' && prev.summary ? prev.summary : title
        }))
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
  }, [plugin.id, resolvedTaskId, t])

  const setField = (key: string, value: string | boolean): void => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className={styles.card} data-plugin-id={plugin.id}>
      <div className={styles.cardHeader}>
        <Text strong>{plugin.name}</Text>
        <span className={styles.badge}>{t('plugin.pricingPaid')}</span>
      </div>
      <Text type="secondary">
        {loading ? t('plugin.formLoading') : t('plugin.formHint', { title: taskTitle || resolvedTaskId })}
      </Text>
      {showInstallHint ? (
        <Text type="secondary" className={styles.formInstallHint}>
          {t('plugin.formJsInstallHint')}
        </Text>
      ) : null}
      {components.map((c) => {
        if (c.type === 'textarea') {
          return (
            <label key={c.key} className={styles.formField}>
              <Text type="secondary">{t(c.labelKey as Parameters<typeof t>[0])}</Text>
              <TextArea
                rows={2}
                value={String(values[c.key] ?? '')}
                onChange={(e) => setField(c.key, e.target.value)}
              />
            </label>
          )
        }
        if (c.type === 'checkbox') {
          return (
            <label key={c.key} className={styles.formField}>
              <Checkbox
                checked={Boolean(values[c.key])}
                onChange={(e) => setField(c.key, e.target.checked)}
              >
                {t(c.labelKey as Parameters<typeof t>[0])}
              </Checkbox>
            </label>
          )
        }
        return (
          <label key={c.key} className={styles.formField}>
            <Text type="secondary">{t(c.labelKey as Parameters<typeof t>[0])}</Text>
            <Input
              value={String(values[c.key] ?? '')}
              onChange={(e) => setField(c.key, e.target.value)}
            />
          </label>
        )
      })}
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
