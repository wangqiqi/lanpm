import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { CompressOutlined, DownloadOutlined, ExpandOutlined } from '@ant-design/icons'
import { Button as ExcalidrawButton, Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import '@excalidraw/excalidraw/index.css'
import { ExcalidrawBinding } from '@mizuka-wu/y-excalidraw'
import * as Y from 'yjs'
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness'
import { useParams, useSearchParams } from 'react-router-dom'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useUiStore } from '@renderer/stores/uiStore'
import {
  emptyWhiteboardSceneJson,
  normalizeSceneJson
} from '@shared/whiteboard/types'
import {
  WHITEBOARD_CRDT_ASSETS_KEY,
  WHITEBOARD_CRDT_ELEMENTS_KEY,
  applyWhiteboardEncodedUpdate,
  createEmptyWhiteboardDoc,
  seedWhiteboardDocFromSceneJson,
  whiteboardDocToSceneJson
} from '@shared/whiteboard/whiteboardCrdtModel'
import { WHITEBOARD_GUIDE_STORAGE_KEY } from '@shared/navigation/guide'
import { ViewLoadingCenter } from '@renderer/ui/ViewState'
import ViewHelpButton from '@renderer/ui/ViewHelpButton'
import styles from './whiteboard.module.css'

type ScenePayload = {
  elements?: readonly ExcalidrawElement[]
  appState?: Partial<AppState>
  files?: BinaryFiles
}

const USER_COLORS = [
  { color: '#30bced', light: '#30bced33' },
  { color: '#6eeb83', light: '#6eeb8333' },
  { color: '#ffbc42', light: '#ffbc4233' },
  { color: '#ee6352', light: '#ee635233' },
  { color: '#8acb88', light: '#8acb8833' }
]

function parseScenePayload(sceneJson: string): ScenePayload {
  try {
    const raw = JSON.parse(normalizeSceneJson(sceneJson)) as ScenePayload & {
      type?: string
    }
    return {
      elements: Array.isArray(raw.elements) ? raw.elements : [],
      appState: raw.appState && typeof raw.appState === 'object' ? raw.appState : {},
      files: raw.files && typeof raw.files === 'object' ? raw.files : {}
    }
  } catch {
    const empty = JSON.parse(emptyWhiteboardSceneJson()) as ScenePayload
    return {
      elements: empty.elements ?? [],
      appState: empty.appState ?? {},
      files: empty.files ?? {}
    }
  }
}

function serializeScene(
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles
): string {
  return normalizeSceneJson(
    JSON.stringify({
      type: 'excalidraw',
      version: 2,
      source: 'lanpm',
      elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor
      },
      files
    })
  )
}

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

export default function WhiteboardView(): React.ReactElement {
  const { locale, t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const { groupId } = useParams<{ groupId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const gid = groupId ?? ''
  const linkTaskFromUrl = searchParams.get('linkTask')?.trim() || undefined
  const theme = useUiStore((s) => s.theme)
  const whiteboardZen = useUiStore((s) => s.whiteboardZen)
  const setWhiteboardZen = useUiStore((s) => s.setWhiteboardZen)

  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [linkedTaskId, setLinkedTaskId] = useState<string | undefined>()
  const [initialData, setInitialData] = useState<ScenePayload | null>(null)
  const [boardKey, setBoardKey] = useState(0)
  const [collabReady, setCollabReady] = useState(false)

  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<{
    elements: readonly ExcalidrawElement[]
    appState: AppState
    files: BinaryFiles
  } | null>(null)
  const linkedTaskIdRef = useRef<string | undefined>(undefined)
  const docRef = useRef<Y.Doc | null>(null)
  const awarenessRef = useRef<Awareness | null>(null)
  const bindingRef = useRef<ExcalidrawBinding | null>(null)
  const anonymousRef = useRef(true)
  const applyingRemoteRef = useRef(false)

  const langCode = locale.startsWith('zh') ? 'zh-CN' : 'en'

  useEffect(() => {
    linkedTaskIdRef.current = linkedTaskId
  }, [linkedTaskId])

  const flushSave = useCallback(async (): Promise<void> => {
    if (!gid) return
    try {
      let sceneJson: string
      if (docRef.current && !anonymousRef.current) {
        sceneJson = whiteboardDocToSceneJson(docRef.current)
      } else if (latestRef.current) {
        const { elements, appState, files } = latestRef.current
        sceneJson = serializeScene(elements, appState, files)
      } else {
        return
      }
      await getLanpmApi().whiteboard.saveScene({
        groupId: gid,
        sceneJson,
        linkedTaskId: linkedTaskIdRef.current ?? null
      })
    } catch (err) {
      message.error(formatError(err, 'whiteboard.saveFailed'))
    }
  }, [gid, message, formatError])

  const teardownCollab = useCallback((): void => {
    bindingRef.current?.destroy()
    bindingRef.current = null
    awarenessRef.current?.destroy()
    awarenessRef.current = null
    docRef.current?.destroy()
    docRef.current = null
    setCollabReady(false)
  }, [])

  const loadScene = useCallback(async (): Promise<void> => {
    if (!gid) return
    setLoading(true)
    teardownCollab()
    try {
      const api = getLanpmApi()
      const scene = await api.whiteboard.getScene(gid)
      const nextLinked = linkTaskFromUrl ?? scene?.linkedTaskId
      setLinkedTaskId(nextLinked)

      const docState = await api.whiteboard.getDocState(gid)
      anonymousRef.current = docState.anonymous

      if (!docState.anonymous) {
        const doc = createEmptyWhiteboardDoc()
        if (docState.updateBase64) {
          applyWhiteboardEncodedUpdate(doc, base64ToBytes(docState.updateBase64), 'load')
        } else {
          seedWhiteboardDocFromSceneJson(
            doc,
            scene?.sceneJson ?? emptyWhiteboardSceneJson(),
            'seed'
          )
        }
        const awareness = new Awareness(doc)
        const status = await api.identity.getSetupStatus()
        const user = status.user
        const palette = colorForUserId(user?.userId ?? 'local')
        awareness.setLocalStateField('user', {
          name: user?.displayName ?? 'User',
          color: palette.color,
          colorLight: palette.light,
          userId: user?.userId
        })

        doc.on('update', (update: Uint8Array, origin: unknown) => {
          if (origin === 'remote' || origin === 'load' || origin === 'seed' || applyingRemoteRef.current) {
            return
          }
          void api.whiteboard.publishUpdate(gid, bytesToBase64(update))
        })

        awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
          if (origin === 'remote') return
          const ids = [...added, ...updated, ...removed]
          if (ids.length === 0) return
          try {
            const encoded = encodeAwarenessUpdate(awareness, ids)
            void api.whiteboard.publishAwareness(gid, bytesToBase64(encoded))
          } catch {
            /* ignore */
          }
        })

        docRef.current = doc
        awarenessRef.current = awareness
        setInitialData({
          elements: [],
          appState: { viewBackgroundColor: '#ffffff' },
          files: {}
        })
        setCollabReady(true)
      } else {
        setInitialData(parseScenePayload(scene?.sceneJson ?? emptyWhiteboardSceneJson()))
        setCollabReady(false)
      }

      setBoardKey((k) => k + 1)
      if (linkTaskFromUrl) {
        const sceneJson = scene?.sceneJson ?? emptyWhiteboardSceneJson()
        await api.whiteboard.saveScene({
          groupId: gid,
          sceneJson,
          linkedTaskId: linkTaskFromUrl
        })
        setSearchParams({}, { replace: true })
      }
    } catch (err) {
      message.error(formatError(err, 'whiteboard.saveFailed'))
      setInitialData(parseScenePayload(emptyWhiteboardSceneJson()))
      setBoardKey((k) => k + 1)
    } finally {
      setLoading(false)
    }
  }, [gid, linkTaskFromUrl, message, formatError, setSearchParams, teardownCollab])

  useEffect(() => {
    void loadScene()
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      teardownCollab()
      setWhiteboardZen(false)
    }
  }, [loadScene, setWhiteboardZen, teardownCollab])

  useEffect(() => {
    if (!gid || anonymousRef.current) return
    const api = getLanpmApi()
    const offUpdate = api.whiteboard.onRemoteUpdate((payload) => {
      if (payload.groupId !== gid || !docRef.current) return
      applyingRemoteRef.current = true
      try {
        applyWhiteboardEncodedUpdate(docRef.current, base64ToBytes(payload.updateBase64), 'remote')
      } finally {
        applyingRemoteRef.current = false
      }
    })
    const offAwareness = api.whiteboard.onRemoteAwareness((payload) => {
      if (payload.groupId !== gid || !awarenessRef.current) return
      applyAwarenessUpdate(awarenessRef.current, base64ToBytes(payload.updateBase64), 'remote')
    })
    return () => {
      offUpdate()
      offAwareness()
    }
  }, [gid, boardKey])

  useEffect(() => {
    if (loading || !initialData) return
    if (localStorage.getItem(WHITEBOARD_GUIDE_STORAGE_KEY)) return
    localStorage.setItem(WHITEBOARD_GUIDE_STORAGE_KEY, '1')
    message.info(t('whiteboard.toolbarHint'), 5)
  }, [loading, initialData, message, t])

  useEffect(() => {
    if (!whiteboardZen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setWhiteboardZen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [whiteboardZen, setWhiteboardZen])

  const scheduleSave = useCallback((): void => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void flushSave()
    }, 900)
  }, [flushSave])

  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      latestRef.current = { elements, appState, files }
      scheduleSave()
    },
    [scheduleSave]
  )

  const bindExcalidraw = useCallback(
    (api: ExcalidrawImperativeAPI): void => {
      apiRef.current = api
      if (!collabReady || !docRef.current || !awarenessRef.current) return
      if (bindingRef.current) return
      const yElements = docRef.current.getArray<Y.Map<unknown>>(WHITEBOARD_CRDT_ELEMENTS_KEY)
      const yAssets = docRef.current.getMap(WHITEBOARD_CRDT_ASSETS_KEY)
      bindingRef.current = new ExcalidrawBinding(
        yElements as Y.Array<Y.Map<unknown>>,
        yAssets,
        api,
        awarenessRef.current
      )
    },
    [collabReady]
  )

  const exportPng = useCallback(async (): Promise<void> => {
    if (!gid) return
    const api = apiRef.current
    const latest = latestRef.current
    setExporting(true)
    try {
      await flushSave()
      const elements = api?.getSceneElements() ?? latest?.elements ?? []
      const appState = api?.getAppState() ?? latest?.appState
      const files = api?.getFiles() ?? latest?.files ?? {}
      if (!appState) throw new Error('no scene')
      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportBackground: true },
        files,
        mimeType: 'image/png'
      })
      const buf = new Uint8Array(await blob.arrayBuffer())
      let binary = ''
      for (const b of buf) binary += String.fromCharCode(b)
      const pngBase64 = btoa(binary)
      await getLanpmApi().whiteboard.exportPng({
        groupId: gid,
        pngBase64,
        linkedTaskId: linkedTaskIdRef.current
      })
      message.success(t('whiteboard.exportDone'))
    } catch (err) {
      message.error(formatError(err, 'whiteboard.exportFailed'))
    } finally {
      setExporting(false)
    }
  }, [gid, message, formatError, t, flushSave])

  const uiOptions = useMemo(
    () => ({
      canvasActions: {
        loadScene: false,
        export: false as const,
        toggleTheme: false,
        saveToActiveFile: false
      }
    }),
    []
  )

  const zenLabel = whiteboardZen ? t('whiteboard.exitZen') : t('whiteboard.zenMode')
  const exportLabel = t('whiteboard.exportPng')
  const linkedTaskLabel = linkedTaskId
    ? t('whiteboard.linkedHint', {
        taskId: linkedTaskId.length > 14 ? `${linkedTaskId.slice(0, 14)}…` : linkedTaskId
      })
    : null

  const renderTopRightUI = useCallback(
    (isMobile: boolean) => {
      if (isMobile) return null
      return (
        <div className={styles.floatingActions} role="toolbar" aria-label={t('whiteboard.actionsAria')}>
          <ViewHelpButton
            buttonClassName={styles.actionBtn}
            content={t('whiteboard.toolbarHint')}
          />
          <Tooltip title={exportLabel}>
            <ExcalidrawButton
              className={styles.actionBtn}
              onSelect={() => {
                if (!exporting) void exportPng()
              }}
              title={exportLabel}
              aria-label={exportLabel}
              disabled={exporting}
            >
              <DownloadOutlined className={styles.actionIcon} />
            </ExcalidrawButton>
          </Tooltip>
          <Tooltip title={zenLabel}>
            <ExcalidrawButton
              className={styles.actionBtn}
              selected={whiteboardZen}
              onSelect={() => setWhiteboardZen(!whiteboardZen)}
              title={zenLabel}
              aria-label={zenLabel}
            >
              {whiteboardZen ? (
                <CompressOutlined className={styles.actionIcon} />
              ) : (
                <ExpandOutlined className={styles.actionIcon} />
              )}
            </ExcalidrawButton>
          </Tooltip>
        </div>
      )
    },
    [exportLabel, zenLabel, exporting, exportPng, whiteboardZen, setWhiteboardZen, t]
  )

  if (!gid) return <ViewLoadingCenter />

  return (
    <div className={`${styles.root} ${whiteboardZen ? styles.rootZen : ''}`}>
      {loading || !initialData ? (
        <ViewLoadingCenter />
      ) : (
        <div className={styles.canvasHost} data-theme={theme} data-zen={whiteboardZen ? '1' : '0'}>
          {linkedTaskLabel ? (
            <span className={styles.linkedBadge} title={linkedTaskLabel}>
              {linkedTaskLabel}
            </span>
          ) : null}
          <Excalidraw
            key={`${gid}-${boardKey}`}
            langCode={langCode}
            theme={theme === 'dark' ? 'dark' : 'light'}
            UIOptions={uiOptions}
            renderTopRightUI={renderTopRightUI}
            initialData={{
              elements: initialData.elements ?? [],
              appState: {
                ...(initialData.appState ?? {}),
                collaborators: new Map()
              },
              files: initialData.files ?? {},
              scrollToContent: true
            }}
            onChange={onChange}
            onPointerUpdate={(payload) => {
              bindingRef.current?.onPointerUpdate(payload)
            }}
            excalidrawAPI={(api) => {
              bindExcalidraw(api)
            }}
          />
        </div>
      )}
    </div>
  )
}
