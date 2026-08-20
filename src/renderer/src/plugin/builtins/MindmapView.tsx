import { useEffect, useRef, useState } from 'react'
import { Typography, message } from 'antd'
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness'
import type { PluginView } from '@shared/plugin/types'
import type { Task } from '@shared/task/types'
import { emptyMindmapDataJson } from '@shared/mindmap/types'
import {
  applyMindmapEncodedUpdate,
  applyMindmapJsonToDoc,
  createEmptyMindmapDoc,
  mindmapDocToDataJson
} from '@shared/mindmap/mindmapCrdtModel'
import { useI18n } from '@renderer/i18n/useI18n'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
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

const USER_COLORS = [
  { color: '#6965db', light: '#e7e6ff' },
  { color: '#2a9d8f', light: '#d8f3ef' },
  { color: '#e76f51', light: '#fde8e2' },
  { color: '#e9c46a', light: '#fbf3d7' }
]

function colorForUserId(userId: string): { color: string; light: string } {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0
  return USER_COLORS[h % USER_COLORS.length]!
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

/** mind-elixir 真库渲染；未安装子包时降级 MindmapStub */
export default function MindmapView({ plugin, groupId, embedded = false }: Props): React.ReactElement {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const mindRef = useRef<MindElixirInstance | null>(null)
  const docRef = useRef<ReturnType<typeof createEmptyMindmapDoc> | null>(null)
  const awarenessRef = useRef<Awareness | null>(null)
  const applyingRemoteRef = useRef(false)
  const [peers, setPeers] = useState<string[]>([])
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
        refresh?: (data: MindElixirData) => void
      }
      mindRef.current = mind

      const docId = useMindmapDocumentStore.getState().docId
      const api = getLanpmApi()
      let initJson = dataJson
      docRef.current?.destroy()
      docRef.current = null
      awarenessRef.current?.destroy()
      awarenessRef.current = null
      applyingRemoteRef.current = false

      if (docId) {
        try {
          const state = await api.mindmap.getDocState(docId)
          if (!state.anonymous) {
            const ydoc = createEmptyMindmapDoc()
            if (state.updateBase64) {
              applyMindmapEncodedUpdate(ydoc, base64ToBytes(state.updateBase64), 'load')
            } else {
              applyMindmapJsonToDoc(ydoc, dataJson, 'seed')
            }
            const awareness = new Awareness(ydoc)
            const status = await api.identity.getSetupStatus()
            const user = status.user
            const palette = colorForUserId(user?.userId ?? 'local')
            awareness.setLocalStateField('user', {
              name: user?.displayName ?? 'User',
              color: palette.color,
              colorLight: palette.light,
              userId: user?.userId
            })
            ydoc.on('update', (update: Uint8Array, origin: unknown) => {
              if (
                origin === 'remote' ||
                origin === 'load' ||
                origin === 'seed' ||
                applyingRemoteRef.current
              ) {
                return
              }
              void api.mindmap.publishUpdate(docId, bytesToBase64(update))
            })
            awareness.on(
              'update',
              (
                { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
                origin: unknown
              ) => {
                if (origin === 'remote') return
                const ids = [...added, ...updated, ...removed]
                if (ids.length === 0) return
                try {
                  const encoded = encodeAwarenessUpdate(awareness, ids)
                  void api.mindmap.publishAwareness(docId, bytesToBase64(encoded))
                } catch {
                  /* ignore */
                }
                const names: string[] = []
                awareness.getStates().forEach((st, client) => {
                  if (client === awareness.clientID) return
                  const rec = st as { user?: { name?: string } }
                  if (rec.user?.name) names.push(rec.user.name)
                })
                setPeers(names)
              }
            )
            docRef.current = ydoc
            awarenessRef.current = awareness
            initJson = mindmapDocToDataJson(ydoc)
          }
        } catch {
          /* fall back to local JSON */
        }
      }

      const data = parseMindmapData(initJson, sdk, t('plugin.mindmapDefaultTitle'))
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
        bus.addListener('operation', () => {
          setDirty(true)
          const ydoc = docRef.current
          const inst = mindRef.current as MindElixirInstance & { getDataString?: () => string }
          if (!ydoc || !inst?.getDataString || applyingRemoteRef.current) return
          applyMindmapJsonToDoc(ydoc, inst.getDataString(), 'local')
        })
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
      awarenessRef.current?.destroy()
      awarenessRef.current = null
      docRef.current?.destroy()
      docRef.current = null
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

  useEffect(() => {
    const docId = useMindmapDocumentStore.getState().docId
    if (!docId) return
    const api = getLanpmApi()
    const offUpdate = api.mindmap.onRemoteUpdate((payload) => {
      if (payload.docId !== docId || !docRef.current) return
      applyingRemoteRef.current = true
      try {
        applyMindmapEncodedUpdate(docRef.current, base64ToBytes(payload.updateBase64), 'remote')
        const inst = mindRef.current as MindElixirInstance & { refresh?: (data: MindElixirData) => void }
        const json = mindmapDocToDataJson(docRef.current)
        inst?.refresh?.(JSON.parse(json) as MindElixirData)
      } finally {
        applyingRemoteRef.current = false
      }
    })
    const offAwareness = api.mindmap.onRemoteAwareness((payload) => {
      if (payload.docId !== docId || !awarenessRef.current) return
      applyAwarenessUpdate(awarenessRef.current, base64ToBytes(payload.updateBase64), 'remote')
      const names: string[] = []
      awarenessRef.current.getStates().forEach((st, client) => {
        if (client === awarenessRef.current?.clientID) return
        const rec = st as { user?: { name?: string } }
        if (rec.user?.name) names.push(rec.user.name)
      })
      setPeers(names)
    })
    return () => {
      offUpdate()
      offAwareness()
    }
  }, [groupId, dataJson, ready])

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
      {peers.length > 0 ? (
        <Text type="secondary" className={styles.mindmapPeers} data-mindmap-peers>
          {t('plugin.mindmapCollabPeers')}: {peers.join(', ')}
        </Text>
      ) : null}
      {!ready ? <Text type="secondary">{t('plugin.formLoading')}</Text> : null}
      <div ref={containerRef} className={styles.mindmapCanvas} data-mindmap-container />
    </div>
  )
}
