import { useEffect, useRef, useState } from 'react'
import { Typography, message } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { Task } from '@shared/task/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import MindmapStub from './MindmapStub'
import {
  loadMindElixirClient,
  loadMindElixirStyles,
  type MindElixirData,
  type MindElixirInstance,
  type MindElixirModule
} from './mindElixirLoader'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
  /** 聊天协作抽屉内嵌：占满面板高度 */
  embedded?: boolean
}

function buildMindData(
  sdk: MindElixirModule,
  groupId: string,
  tasks: Task[],
  rootLabel: string
): MindElixirData {
  const root = sdk.default.new(rootLabel)
  const children = tasks.slice(0, 24).map((task) => ({
    id: task.taskId,
    topic: task.title || task.taskId
  }))
  root.nodeData.children = children
  root.nodeData.id = `group-${groupId}`
  return root
}

/** mind-elixir 真库渲染；未安装子包时降级 MindmapStub */
export default function MindmapView({ plugin, groupId, embedded = false }: Props): React.ReactElement {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const mindRef = useRef<MindElixirInstance | null>(null)
  const [sdk, setSdk] = useState<MindElixirModule | null | undefined>(undefined)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void loadMindElixirClient().then((mod) => {
      if (!cancelled) setSdk(mod)
    })
    return () => {
      cancelled = true
    }
  }, [])

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

  useEffect(() => {
    if (sdk === undefined || sdk === null || loading) return
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    setReady(false)

    void (async () => {
      await loadMindElixirStyles()
      if (cancelled) return
      mindRef.current?.destroy?.()
      const mind = new sdk.default({
        el: container,
        direction: sdk.default.LEFT,
        draggable: true,
        toolBar: true,
        nodeMenu: true,
        contextMenu: true,
        keypress: true
      })
      mindRef.current = mind
      const data = buildMindData(sdk, groupId, tasks, t('plugin.mindmapRoot'))
      mind.init(data)
      if (!cancelled) setReady(true)
    })().catch((err: unknown) => {
      if (!cancelled) {
        message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
      }
    })

    return () => {
      cancelled = true
      mindRef.current?.destroy?.()
      mindRef.current = null
    }
  }, [sdk, loading, tasks, groupId, t])

  if (sdk === undefined || loading) {
    return (
      <div className={styles.card} data-plugin-id={plugin.id}>
        <Text type="secondary">{t('plugin.formLoading')}</Text>
      </div>
    )
  }

  if (sdk === null) {
    return <MindmapStub plugin={plugin} groupId={groupId} showInstallHint />
  }

  return (
    <div
      className={`${styles.mindmapHost}${embedded ? ` ${styles.mindmapHostEmbedded}` : ''}`}
      data-plugin-id={plugin.id}
      data-mindmap-engine="mind-elixir"
      data-mindmap-ready={ready ? '1' : '0'}
      data-embedded={embedded ? '1' : '0'}
    >
      {!ready ? <Text type="secondary">{t('plugin.formLoading')}</Text> : null}
      <div ref={containerRef} className={styles.mindmapCanvas} data-mindmap-container />
    </div>
  )
}
