import { useEffect, useRef, useState } from 'react'
import { Typography, message } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { Task } from '@shared/task/types'
import { emptyMindmapDataJson } from '@shared/mindmap/types'
import { useI18n } from '@renderer/i18n/useI18n'
import { useMindmapDocumentStore } from '@renderer/stores/mindmapDocumentStore'
import MindmapStub from './MindmapStub'
import MindmapToolbar from './MindmapToolbar'
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

function buildMindDataFromTasks(
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

function parseMindmapData(dataJson: string, sdk: MindElixirModule, fallbackTopic: string): MindElixirData {
  try {
    return JSON.parse(dataJson) as MindElixirData
  } catch {
    return JSON.parse(emptyMindmapDataJson(fallbackTopic)) as MindElixirData
  }
}

/** mind-elixir 真库渲染；未安装子包时降级 MindmapStub */
export default function MindmapView({ plugin, groupId, embedded = false }: Props): React.ReactElement {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const mindRef = useRef<MindElixirInstance | null>(null)
  const [sdk, setSdk] = useState<MindElixirModule | null | undefined>(undefined)
  const [dataJson, setDataJson] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const setDirty = useMindmapDocumentStore((s) => s.setDirty)
  const registerSerializer = useMindmapDocumentStore((s) => s.registerSerializer)
  const registerExportPng = useMindmapDocumentStore((s) => s.registerExportPng)
  const refreshList = useMindmapDocumentStore((s) => s.refreshList)
  const openDocument = useMindmapDocumentStore((s) => s.openDocument)
  const createDocument = useMindmapDocumentStore((s) => s.createDocument)
  const resetStore = useMindmapDocumentStore((s) => s.reset)

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
    const onReload = (): void => setReloadToken((n) => n + 1)
    const onImport = (event: Event): void => {
      const detail = (event as CustomEvent<{ tasks: Task[] }>).detail
      if (!mindRef.current || !sdk || sdk === null) return
      const data = buildMindDataFromTasks(sdk, groupId, detail.tasks ?? [], t('plugin.mindmapRoot'))
      mindRef.current.refresh(data)
      setDirty(true)
    }
    window.addEventListener('lanpm:mindmap-reload', onReload)
    window.addEventListener('lanpm:mindmap-import-tasks', onImport)
    return () => {
      window.removeEventListener('lanpm:mindmap-reload', onReload)
      window.removeEventListener('lanpm:mindmap-import-tasks', onImport)
    }
  }, [groupId, sdk, setDirty, t])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        await refreshList(groupId)
        let id = useMindmapDocumentStore.getState().docId
        if (!id) {
          const docs = useMindmapDocumentStore.getState().documents
          if (docs.length > 0) {
            id = docs[0]!.docId
          } else {
            await createDocument(groupId)
            id = useMindmapDocumentStore.getState().docId
          }
        }
        if (!id) throw new Error('mindmap doc missing')
        const json = await openDocument(id)
        if (!cancelled) setDataJson(json)
      } catch (err) {
        if (!cancelled) {
          message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [groupId, reloadToken, refreshList, openDocument, createDocument, t])

  useEffect(() => {
    return () => {
      resetStore()
    }
  }, [groupId, resetStore])

  useEffect(() => {
    if (sdk === undefined || sdk === null || loading || !dataJson) return
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
      }) as MindElixirInstance & {
        getDataString?: () => string
        exportPng?: (a?: boolean, b?: string) => Promise<Blob | null>
        bus?: { addListener: (event: string, cb: () => void) => void }
      }
      mindRef.current = mind
      const data = parseMindmapData(dataJson, sdk, t('plugin.mindmapDefaultTitle'))
      mind.init(data)

      registerSerializer(() => {
        const inst = mindRef.current as MindElixirInstance & { getDataString?: () => string }
        if (inst?.getDataString) return inst.getDataString()
        return dataJson
      })
      registerExportPng(async () => {
        const inst = mindRef.current as MindElixirInstance & {
          exportPng?: (a?: boolean, b?: string) => Promise<Blob | null>
        }
        if (!inst?.exportPng) return null
        return inst.exportPng(true)
      })

      const bus = (mind as { bus?: { addListener: (event: string, cb: () => void) => void } }).bus
      if (bus?.addListener) {
        bus.addListener('operation', () => setDirty(true))
      }

      if (!cancelled) setReady(true)
    })().catch((err: unknown) => {
      if (!cancelled) {
        message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
      }
    })

    return () => {
      cancelled = true
      registerSerializer(null)
      registerExportPng(null)
      mindRef.current?.destroy?.()
      mindRef.current = null
    }
  }, [
    sdk,
    loading,
    dataJson,
    groupId,
    t,
    registerSerializer,
    registerExportPng,
    setDirty
  ])

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
      {embedded ? <MindmapToolbar plugin={plugin} groupId={groupId} /> : null}
      {!ready ? <Text type="secondary">{t('plugin.formLoading')}</Text> : null}
      <div ref={containerRef} className={styles.mindmapCanvas} data-mindmap-container />
    </div>
  )
}
