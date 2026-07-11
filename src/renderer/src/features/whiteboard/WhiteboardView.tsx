import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from 'antd'
import { DownloadOutlined, SaveOutlined } from '@ant-design/icons'
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
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
import ViewToolbar, { ViewToolbarGroup, ViewToolbarHint } from '@renderer/ui/ViewToolbar'
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

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [dirty, setDirty] = useState(false)
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

  const langCode = locale.startsWith('zh') ? 'zh-CN' : 'en'

  const loadScene = useCallback(async (): Promise<void> => {
    if (!gid) return
    setLoading(true)
    try {
      const scene = await getLanpmApi().whiteboard.getScene(gid)
      const nextLinked = linkTaskFromUrl ?? scene?.linkedTaskId
      setLinkedTaskId(nextLinked)
      setInitialData(parseScenePayload(scene?.sceneJson ?? emptyWhiteboardSceneJson()))
      setBoardKey((k) => k + 1)
      setDirty(false)
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
    }
  }, [loadScene])

  const persist = useCallback(async (): Promise<void> => {
    if (!gid || !latestRef.current) return
    setSaving(true)
    try {
      const { elements, appState, files } = latestRef.current
      await getLanpmApi().whiteboard.saveScene({
        groupId: gid,
        sceneJson: serializeScene(elements, appState, files),
        linkedTaskId: linkedTaskId ?? null
      })
      setDirty(false)
    } catch (err) {
      message.error(formatError(err, 'whiteboard.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [gid, linkedTaskId, message, formatError])

  const scheduleSave = useCallback((): void => {
    setDirty(true)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void persist()
    }, 900)
  }, [persist])

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
        linkedTaskId
      })
      message.success(t('whiteboard.exportDone'))
    } catch (err) {
      message.error(formatError(err, 'whiteboard.exportFailed'))
    } finally {
      setExporting(false)
    }
  }, [gid, linkedTaskId, message, formatError, t])

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

  const hint = linkedTaskId
    ? t('whiteboard.linkedHint', { taskId: linkedTaskId.slice(0, 8) })
    : t('whiteboard.toolbarHint')

  if (!gid) return <ViewLoadingCenter />

  return (
    <div className={styles.root}>
      <ViewToolbar
        start={
          <ViewToolbarGroup>
            <Button
              size="small"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!dirty && !saving}
              onClick={() => void persist()}
            >
              {t('whiteboard.save')}
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={() => void exportPng()}
            >
              {t('whiteboard.exportPng')}
            </Button>
          </ViewToolbarGroup>
        }
        end={<ViewToolbarHint>{hint}</ViewToolbarHint>}
      />
      {loading || !initialData ? (
        <ViewLoadingCenter />
      ) : (
        <div className={styles.canvasHost} data-theme={theme}>
          <Excalidraw
            key={`${gid}-${boardKey}`}
            langCode={langCode}
            theme={theme === 'dark' ? 'dark' : 'light'}
            UIOptions={uiOptions}
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
