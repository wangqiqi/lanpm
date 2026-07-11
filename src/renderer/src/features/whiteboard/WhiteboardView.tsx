import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { CompressOutlined, DownloadOutlined, ExpandOutlined } from '@ant-design/icons'
import { Button as ExcalidrawButton, Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import '@excalidraw/excalidraw/index.css'
import { useParams, useSearchParams } from 'react-router-dom'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useUiStore } from '@renderer/stores/uiStore'
import {
  emptyWhiteboardSceneJson,
  normalizeSceneJson
} from '@shared/whiteboard/types'
import { ViewLoadingCenter } from '@renderer/ui/ViewState'
import styles from './whiteboard.module.css'

type ScenePayload = {
  elements?: readonly ExcalidrawElement[]
  appState?: Partial<AppState>
  files?: BinaryFiles
}

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

  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<{
    elements: readonly ExcalidrawElement[]
    appState: AppState
    files: BinaryFiles
  } | null>(null)
  const linkedTaskIdRef = useRef<string | undefined>(undefined)

  const langCode = locale.startsWith('zh') ? 'zh-CN' : 'en'

  useEffect(() => {
    linkedTaskIdRef.current = linkedTaskId
  }, [linkedTaskId])

  const flushSave = useCallback(async (): Promise<void> => {
    if (!gid || !latestRef.current) return
    try {
      const { elements, appState, files } = latestRef.current
      await getLanpmApi().whiteboard.saveScene({
        groupId: gid,
        sceneJson: serializeScene(elements, appState, files),
        linkedTaskId: linkedTaskIdRef.current ?? null
      })
    } catch (err) {
      message.error(formatError(err, 'whiteboard.saveFailed'))
    }
  }, [gid, message, formatError])

  const loadScene = useCallback(async (): Promise<void> => {
    if (!gid) return
    setLoading(true)
    try {
      const scene = await getLanpmApi().whiteboard.getScene(gid)
      const nextLinked = linkTaskFromUrl ?? scene?.linkedTaskId
      setLinkedTaskId(nextLinked)
      setInitialData(parseScenePayload(scene?.sceneJson ?? emptyWhiteboardSceneJson()))
      setBoardKey((k) => k + 1)
      if (linkTaskFromUrl) {
        const sceneJson = scene?.sceneJson ?? emptyWhiteboardSceneJson()
        await getLanpmApi().whiteboard.saveScene({
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
  }, [gid, linkTaskFromUrl, message, formatError, setSearchParams])

  useEffect(() => {
    void loadScene()
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setWhiteboardZen(false)
    }
  }, [loadScene, setWhiteboardZen])

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

  const renderTopRightUI = useCallback(
    (isMobile: boolean) => {
      if (isMobile) return null
      return (
        <div className={styles.floatingActions} role="toolbar" aria-label={t('whiteboard.actionsAria')}>
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
            excalidrawAPI={(api) => {
              apiRef.current = api
            }}
          />
        </div>
      )}
    </div>
  )
}
