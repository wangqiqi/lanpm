import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Collapse,
  Drawer,
  Dropdown,
  Image,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography
} from 'antd'
import type { MenuProps } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { ColumnsType, TableProps } from 'antd/es/table'
import {
  CommentOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExportOutlined,
  FileSearchOutlined,
  ImportOutlined,
  InboxOutlined,
  LinkOutlined,
  MoreOutlined,
  PaperClipOutlined,
  PlusOutlined,
  SettingOutlined,
  UploadOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import type { FileCategory, FileMeta, FileTransferView } from '@shared/file/types'
import { isLocalRemovedPath, isRemotePendingPath } from '@shared/file/sync'
import { useFileStore } from '@renderer/stores/fileStore'
import { useTaskStore } from '@renderer/stores/taskStore'
import { TransferActiveRow } from './TransferActiveRow'
import { useChatStore } from '@renderer/stores/chatStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import ViewToolbar from '@renderer/ui/ViewToolbar'
import ViewSegment from '@renderer/ui/ViewSegment'
import RegionButton from '@renderer/ui/RegionButton'
import { ViewEmptyHint, ViewEmptyIcon, ViewErrorCenter, ViewLoadingCenter } from '@renderer/ui/ViewState'
import IslandPanel from '@renderer/ui/IslandPanel'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { useMediaQuery } from '@renderer/hooks/useMediaQuery'
import { groupViewPath } from '@renderer/routes/paths'
import BookmarkWebView from '@renderer/features/files/BookmarkWebView'
import { useLocateTask } from '@renderer/features/task/useLocateTask'
import { formatFileTypeLabel } from '@shared/file/formatFileType'
import { buildDeliverableIndex, tasksForFile } from '@shared/task/deliverables'
import { mergeLinkedFileId, removeLinkedFileId } from '@shared/task/linkFile'
import {
  applyLibraryFilters,
  CATEGORY_I18N_KEYS,
  filterFiles,
  formatFileUploadedAt,
  type FileLibraryScope,
  type FileSortField,
  type FileSortOrder
} from '@renderer/features/files/fileListModel'
import { isTextPreviewFile } from '@shared/file/previewExtensions'
import { loadPreviewText } from '@renderer/features/files/loadPreviewText'
import { runOnEnter } from '@renderer/lib/inputKeyboard'
import { PluginZoneHost } from '@renderer/plugin/PluginSlot'
import styles from './files.module.css'

const { Text } = Typography

const SORTABLE_FIELDS = new Set<FileSortField>(['name', 'type', 'size', 'uploadedAt'])

function resolveSortField(sorter: unknown): FileSortField | null {
  if (!sorter || Array.isArray(sorter) || typeof sorter !== 'object') return null
  const s = sorter as { columnKey?: string; field?: string | string[]; order?: string | null }
  const raw = s.columnKey ?? s.field
  const key = (Array.isArray(raw) ? raw[0] : raw) as string | undefined
  if (!key || !SORTABLE_FIELDS.has(key as FileSortField)) return null
  return key as FileSortField
}

const CATEGORY_KEYS: { key: MessageKey; value: FileCategory | 'all' }[] = [
  { key: 'files.categoryAll', value: 'all' },
  { key: 'files.categoryDocument', value: 'document' },
  { key: 'files.categoryImage', value: 'image' },
  { key: 'files.categoryVideo', value: 'video' },
  { key: 'files.categoryCode', value: 'code' },
  { key: 'files.categoryBookmark', value: 'bookmark' },
  { key: 'files.categoryOther', value: 'other' }
]

const TRANSFER_STATUS_KEYS: Record<string, MessageKey> = {
  queued: 'files.transferQueued',
  transferring: 'files.transferTransferring',
  completed: 'files.transferCompleted',
  failed: 'files.transferFailed',
  paused: 'files.transferPaused',
  cancelled: 'files.transferCancelled'
}

function isResumableTransfer(tr: FileTransferView): boolean {
  if (tr.transferredBytes <= 0 || tr.transferredBytes >= tr.totalBytes) return false
  if (tr.status === 'failed' || tr.status === 'paused' || tr.status === 'cancelled') return true
  return tr.direction === 'download' && tr.status === 'transferring'
}

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** 仅当预览相关字段变化时才刷新 selected，避免 files 列表重载导致预览反复取消 */
function previewMetaKey(meta: FileMeta): string {
  return `${meta.fileId}:${meta.previewStatus}:${meta.storagePath}:${meta.name}:${meta.ext}`
}

export default function FilesView(): React.ReactElement {
  const { t, locale, formatError } = useI18n()
  const [transferPanelExpanded, setTransferPanelExpanded] = useState(false)
  const { message } = useLanpmApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const files = useFileStore((s) => s.filesByGroup[gid] ?? [])
  const transfers = useFileStore((s) => s.transfersByGroup[gid] ?? [])
  const transferHistory = useFileStore((s) => s.transferHistoryByGroup[gid] ?? [])
  const transferSettings = useFileStore((s) => s.transferSettings)
  const loading = useFileStore((s) => s.loading[gid])
  const loadFiles = useFileStore((s) => s.loadFiles)
  const loadTransfers = useFileStore((s) => s.loadTransfers)
  const loadTransferHistory = useFileStore((s) => s.loadTransferHistory)
  const loadTransferSettings = useFileStore((s) => s.loadTransferSettings)
  const setTransferRate = useFileStore((s) => s.setTransferRate)
  const resumeTransfer = useFileStore((s) => s.resumeTransfer)
  const cancelTransfer = useFileStore((s) => s.cancelTransfer)
  const upload = useFileStore((s) => s.upload)
  const addBookmark = useFileStore((s) => s.addBookmark)
  const importBookmarks = useFileStore((s) => s.importBookmarks)
  const exportBookmarks = useFileStore((s) => s.exportBookmarks)
  const pullRemote = useFileStore((s) => s.pullRemote)
  const download = useFileStore((s) => s.download)
  const sendExistingFile = useChatStore((s) => s.sendExistingFile)
  const tasks = useTaskStore((s) => s.tasksByGroup[gid] ?? [])
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const updateTask = useTaskStore((s) => s.updateTask)

  const [category, setCategory] = useState<FileCategory | 'all'>('all')
  const [libraryScope, setLibraryScope] = useState<FileLibraryScope>('all')
  const [taskFilterId, setTaskFilterId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<FileSortField>('uploadedAt')
  const [sortOrder, setSortOrder] = useState<FileSortOrder>('descend')
  const [selected, setSelected] = useState<FileMeta | null>(null)
  const [pulling, setPulling] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const consumedSelectFileIdRef = useRef<string | null>(null)
  const previewRequestRef = useRef(0)
  const [bookmarkOpen, setBookmarkOpen] = useState(false)
  const [bookmarkUrl, setBookmarkUrl] = useState('')
  const [bookmarkTitle, setBookmarkTitle] = useState('')
  const [bookmarkSaving, setBookmarkSaving] = useState(false)
  const [sharingToChat, setSharingToChat] = useState(false)
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false)
  const [linkFileModal, setLinkFileModal] = useState<{
    fileId: string
    fileName: string
  } | null>(null)
  const [linkTaskId, setLinkTaskId] = useState<string | undefined>()
  const [linkSaving, setLinkSaving] = useState(false)
  const isNarrow = useMediaQuery('(max-width: 960px)')
  const locateTask = useLocateTask(gid)

  const categories = useMemo(
    () => CATEGORY_KEYS.map((c) => ({ label: t(c.key), value: c.value })),
    [t]
  )

  const libraryScopeOptions = useMemo(
    () => [
      { label: t('files.scopeAll'), value: 'all' as const },
      { label: t('files.scopeDeliverables'), value: 'deliverables' as const }
    ],
    [t]
  )

  const deliverableIndex = useMemo(() => buildDeliverableIndex(tasks), [tasks])

  const taskFilterOptions = useMemo(() => {
    const withLinks = tasks.filter(
      (task) => !task.deletedAt && (task.linkedFileIds?.length ?? 0) > 0
    )
    return withLinks.map((task) => ({ value: task.taskId, label: task.title }))
  }, [tasks])

  const categoryLabels = useMemo(
    () => ({
      document: t(CATEGORY_I18N_KEYS.document),
      image: t(CATEGORY_I18N_KEYS.image),
      video: t(CATEGORY_I18N_KEYS.video),
      code: t(CATEGORY_I18N_KEYS.code),
      bookmark: t(CATEGORY_I18N_KEYS.bookmark),
      other: t(CATEGORY_I18N_KEYS.other)
    }),
    [t]
  )

  const filteredFiles = useMemo(() => {
    const scoped = applyLibraryFilters(files, {
      scope: libraryScope,
      taskId: taskFilterId,
      fileToTaskIds: deliverableIndex.fileToTaskIds,
      taskToFileIds: deliverableIndex.taskToFileIds
    })
    return filterFiles(scoped, searchQuery)
  }, [files, searchQuery, libraryScope, taskFilterId, deliverableIndex])

  useEffect(() => {
    consumedSelectFileIdRef.current = null
    setLibraryScope('all')
    setTaskFilterId(null)
  }, [gid])

  useEffect(() => {
    if (!isNarrow) setPreviewDrawerOpen(false)
  }, [isNarrow])

  useEffect(() => {
    if (!selected) setPreviewDrawerOpen(false)
  }, [selected])

  useEffect(() => {
    const state = location.state as { selectFileId?: string } | null
    const targetId = state?.selectFileId
    if (!targetId || !gid) return
    if (consumedSelectFileIdRef.current === targetId) return
    const match = files.find((f) => f.fileId === targetId)
    if (!match) return
    consumedSelectFileIdRef.current = targetId
    setSelected(match)
    if (isNarrow) setPreviewDrawerOpen(true)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate, files, gid, isNarrow])

  useEffect(() => {
    if (filteredFiles.length === 0) {
      if (selected) setSelected(null)
      return
    }
    if (selected && filteredFiles.some((f) => f.fileId === selected.fileId)) return
    setSelected(filteredFiles[0]!)
  }, [filteredFiles, selected?.fileId])

  useEffect(() => {
    if (!selected) return
    const fresh = files.find((f) => f.fileId === selected.fileId)
    if (!fresh) return
    if (previewMetaKey(fresh) === previewMetaKey(selected)) return
    setSelected(fresh)
  }, [files, selected])

  useEffect(() => {
    if (!gid) return
    void loadFiles(gid, category === 'all' ? undefined : category)
    void loadTasks(gid)
    void loadTransfers(gid)
    void loadTransferHistory(gid)
    void loadTransferSettings()
    const unsub = getLanpmApi().file.onTransfersChanged((changed) => {
      if (changed === gid) {
        void loadTransfers(gid)
        void loadTransferHistory(gid)
        void loadFiles(gid, category === 'all' ? undefined : category)
      }
    })
    return unsub
  }, [gid, category, loadFiles, loadTasks, loadTransfers, loadTransferHistory, loadTransferSettings])

  useEffect(() => {
    if (!selected) {
      setPreviewUrl(null)
      setPreviewText(null)
      setPreviewError(false)
      setPreviewLoading(false)
      return
    }
    if (selected.isBookmark) {
      setPreviewUrl(null)
      setPreviewText(null)
      setPreviewError(false)
      setPreviewLoading(false)
      return
    }
    if (isRemotePendingPath(selected.storagePath)) {
      setPreviewUrl(null)
      setPreviewText(null)
      setPreviewError(false)
      setPreviewLoading(false)
      return
    }
    if (isLocalRemovedPath(selected.storagePath)) {
      setPreviewUrl(null)
      setPreviewText(null)
      setPreviewError(false)
      setPreviewLoading(false)
      return
    }
    if (selected.previewStatus === 'converting') {
      setPreviewUrl(null)
      setPreviewText(null)
      setPreviewError(false)
      setPreviewLoading(false)
      return
    }

    const fileId = selected.fileId
    const isTextPreview = isTextPreviewFile(selected.name, selected.ext)
    const requestId = ++previewRequestRef.current

    setPreviewUrl(null)
    setPreviewText(null)
    setPreviewError(false)
    setPreviewLoading(true)

    if (isTextPreview) {
      void loadPreviewText(fileId)
        .then((text) => {
          if (previewRequestRef.current !== requestId) return
          setPreviewText(text)
          setPreviewError(text === null)
        })
        .catch(() => {
          if (previewRequestRef.current !== requestId) return
          setPreviewText(null)
          setPreviewError(true)
        })
        .finally(() => {
          if (previewRequestRef.current !== requestId) return
          setPreviewLoading(false)
        })
      return
    }

    void getLanpmApi()
      .file.getPreviewUrl(fileId)
      .then((url) => {
        if (previewRequestRef.current !== requestId) return
        setPreviewUrl(url)
        setPreviewError(!url)
      })
      .catch(() => {
        if (previewRequestRef.current !== requestId) return
        setPreviewUrl(null)
        setPreviewError(true)
      })
      .finally(() => {
        if (previewRequestRef.current !== requestId) return
        setPreviewLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅随预览相关字段变化重载
  }, [
    selected?.fileId,
    selected?.previewStatus,
    selected?.storagePath,
    selected?.name,
    selected?.ext,
    selected?.isBookmark
  ])

  const handlePullRemote = async (): Promise<void> => {
    if (!selected || !gid || !isRemotePendingPath(selected.storagePath)) return
    const resumable = [...transfers, ...transferHistory].find(
      (tr) =>
        tr.fileId === selected.fileId &&
        tr.direction === 'download' &&
        isResumableTransfer(tr)
    )
    setPulling(true)
    try {
      if (resumable) {
        await resumeTransfer(gid, resumable.transferId)
        const files = await getLanpmApi().file.listFiles(gid)
        const updated = files.find((f) => f.fileId === selected.fileId)
        if (updated) setSelected(updated)
        message.success(t('files.previewReady'))
      } else {
        const meta = await pullRemote(gid, selected.fileId)
        setSelected(meta)
        message.success(t('files.previewReady'))
      }
    } catch (err) {
      message.error(
        formatError(err, resumable ? 'files.transferResumeFailed' : 'files.pullRemoteFailed')
      )
    } finally {
      setPulling(false)
    }
  }

  const retryPreview = (): void => {
    if (!selected || selected.isBookmark) return
    if (isRemotePendingPath(selected.storagePath)) {
      void handlePullRemote()
      return
    }
    const fileId = selected.fileId
    const requestId = ++previewRequestRef.current
    setPreviewUrl(null)
    setPreviewText(null)
    setPreviewError(false)
    setPreviewLoading(true)
    if (isTextPreviewFile(selected.name, selected.ext)) {
      void loadPreviewText(fileId)
        .then((text) => {
          if (previewRequestRef.current !== requestId) return
          setPreviewText(text)
          setPreviewError(text === null)
        })
        .catch(() => {
          if (previewRequestRef.current !== requestId) return
          setPreviewError(true)
        })
        .finally(() => {
          if (previewRequestRef.current !== requestId) return
          setPreviewLoading(false)
        })
      return
    }
    void getLanpmApi()
      .file.getPreviewUrl(fileId)
      .then((url) => {
        if (previewRequestRef.current !== requestId) return
        setPreviewUrl(url)
        setPreviewError(!url)
      })
      .catch(() => {
        if (previewRequestRef.current !== requestId) return
        setPreviewError(true)
      })
      .finally(() => {
        if (previewRequestRef.current !== requestId) return
        setPreviewLoading(false)
      })
  }

  const handleDeleteLocal = useCallback(
    async (file: FileMeta): Promise<void> => {
      if (file.isBookmark || isRemotePendingPath(file.storagePath)) return
      Modal.confirm({
        title: t('files.deleteLocalConfirmTitle'),
        content: t('files.deleteLocalConfirmBody'),
        okText: t('files.deleteLocalRun'),
        cancelText: t('common.cancel'),
        okButtonProps: { danger: true },
        onOk: async () => {
          const ok = await getLanpmApi().file.deleteLocal(file.fileId)
          if (!ok) {
            message.warning(t('files.deleteLocalFailed'))
            return
          }
          message.success(t('files.deleteLocalDone'))
          if (selected?.fileId === file.fileId) setSelected(null)
          void loadFiles(gid, category === 'all' ? undefined : category)
        }
      })
    },
    [gid, category, loadFiles, message, selected, t]
  )

  const handleDownload = useCallback(
    async (file: FileMeta): Promise<void> => {
      if (file.isBookmark || isRemotePendingPath(file.storagePath)) return
      setDownloading(true)
      try {
        const path = await download(file.fileId)
        if (path) message.success(t('files.downloadSuccess', { path }))
      } catch (err) {
        message.error(formatError(err, 'files.downloadFailed'))
      } finally {
        setDownloading(false)
      }
    },
    [download, message, t]
  )

  const handleTableChange: TableProps<FileMeta>['onChange'] = (_pag, _filters, sorter) => {
    if (Array.isArray(sorter)) return
    const s = sorter as { columnKey?: string; field?: string | string[]; order?: FileSortOrder | null }
    const order = s.order
    const field = resolveSortField(sorter)

    if (!order) {
      // Ant Design 第三次点击会「取消排序」且清空 field；改为同列升降序来回切换
      if (field) setSortField(field)
      setSortOrder((prev) => (prev === 'ascend' ? 'descend' : 'ascend'))
      return
    }

    if (!field) return
    setSortField(field)
    setSortOrder(order)
  }

  const handleShareToChat = (): void => {
    if (!selected || !gid) return
    setSharingToChat(true)
    void sendExistingFile(gid, selected.fileId)
      .then(() => {
        message.success(t('files.sharedToChat'))
        navigate(groupViewPath(gid, 'chat'))
      })
      .catch((err: unknown) => {
        message.error(formatError(err, 'chat.fileSendFailed'))
      })
      .finally(() => setSharingToChat(false))
  }

  const saveBookmark = async (): Promise<void> => {
    if (!gid) return
    setBookmarkSaving(true)
    try {
      await addBookmark(gid, bookmarkUrl.trim(), bookmarkTitle.trim())
      message.success(t('files.bookmarkAdded'))
      setBookmarkOpen(false)
      setBookmarkUrl('')
      setBookmarkTitle('')
      setCategory('bookmark')
      void loadFiles(gid, 'bookmark')
    } catch (err) {
      message.error(formatError(err, 'files.bookmarkAddFailed'))
    } finally {
      setBookmarkSaving(false)
    }
  }

  const handleImportBookmarks = async (): Promise<void> => {
    if (!gid) return
    try {
      const imported = await importBookmarks(gid)
      if (imported.length === 0) {
        message.info(t('files.noBookmarksImported'))
        return
      }
      message.success(t('files.bookmarksImported', { count: imported.length }))
      setCategory('bookmark')
      void loadFiles(gid, 'bookmark')
    } catch (err) {
      message.error(formatError(err, 'files.importFailed'))
    }
  }

  const handleExportBookmarks = async (): Promise<void> => {
    if (!gid) return
    try {
      const path = await exportBookmarks(gid)
      if (path) message.success(t('files.exportedTo', { path }))
    } catch (err) {
      message.error(formatError(err, 'files.exportFailed'))
    }
  }

  const activeTransfers = useMemo(
    () => transfers.filter((tr) => tr.status === 'queued' || tr.status === 'transferring'),
    [transfers]
  )

  const resumableDownload = useMemo(() => {
    if (!selected || !isRemotePendingPath(selected.storagePath)) return null
    return (
      [...transfers, ...transferHistory].find(
        (tr) =>
          tr.fileId === selected.fileId &&
          tr.direction === 'download' &&
          isResumableTransfer(tr)
      ) ?? null
    )
  }, [selected, transfers, transferHistory])

  const isExpanded = useMemo(
    () => transferPanelExpanded || activeTransfers.length > 0,
    [transferPanelExpanded, activeTransfers]
  )

  const handleResume = (transferId: string): void => {
    void resumeTransfer(gid, transferId).catch((err: unknown) =>
      message.error(formatError(err, 'files.transferResumeFailed'))
    )
  }

  const handleCancel = (transferId: string): void => {
    void cancelTransfer(gid, transferId).catch((err: unknown) =>
      message.error(formatError(err, 'files.transferCancelFailed'))
    )
  }

  const handleConfirmLinkFile = useCallback(async (): Promise<void> => {
    if (!gid || !linkFileModal || !linkTaskId) return
    const task = tasks.find((item) => item.taskId === linkTaskId)
    if (!task) return
    setLinkSaving(true)
    try {
      await updateTask({
        taskId: task.taskId,
        linkedFileIds: mergeLinkedFileId(task.linkedFileIds, linkFileModal.fileId)
      })
      message.success(t('files.linkToTaskDone'))
      setLinkFileModal(null)
      setLinkTaskId(undefined)
      setLibraryScope('deliverables')
    } catch (err) {
      message.error(formatError(err, 'tree.updateFailed'))
    } finally {
      setLinkSaving(false)
    }
  }, [gid, linkFileModal, linkTaskId, tasks, updateTask, message, t, formatError])

  const handleUnlinkFile = useCallback(
    async (fileId: string, taskId: string): Promise<void> => {
      const task = tasks.find((item) => item.taskId === taskId)
      if (!task) return
      try {
        await updateTask({
          taskId: task.taskId,
          linkedFileIds: removeLinkedFileId(task.linkedFileIds, fileId)
        })
        message.success(t('files.unlinkDone'))
      } catch (err) {
        message.error(formatError(err, 'tree.updateFailed'))
      }
    },
    [tasks, updateTask, message, t, formatError]
  )

  const openLinkModal = useCallback((file: FileMeta): void => {
    setLinkFileModal({ fileId: file.fileId, fileName: file.name })
    setLinkTaskId(undefined)
  }, [])

  const openLinkedTask = useCallback(
    (taskId: string): void => {
      locateTask(taskId, 'board')
    },
    [locateTask]
  )

  const columns = useMemo((): ColumnsType<FileMeta> => {
    const activeOrder = (field: FileSortField) => (sortField === field ? sortOrder : null)
    return [
      {
        title: t('files.colName'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        sorter: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        sortOrder: activeOrder('name'),
        render: (_: unknown, r: FileMeta) =>
          r.isBookmark ? (
            <span className={styles.nameCell}>
              <LinkOutlined className={styles.bookmarkNameIcon} aria-hidden />
              <Text ellipsis={{ tooltip: r.name }} className={styles.nameText}>
                {r.name}
              </Text>
              <Tag className={styles.bookmarkTag}>{t('files.bookmarkRowTag')}</Tag>
            </span>
          ) : (
            <Text ellipsis={{ tooltip: r.name }}>{r.name}</Text>
          )
      },
      {
        title: t('files.colTasks'),
        key: 'tasks',
        width: 140,
        ellipsis: true,
        render: (_: unknown, r: FileMeta) => {
          const linked = tasksForFile(r.fileId, deliverableIndex.fileToTasks)
          if (linked.length === 0) return <Text type="secondary">—</Text>
          return (
            <Space size={[4, 4]} wrap onClick={(e) => e.stopPropagation()}>
              {linked.map((ref) => (
                <Tag
                  key={ref.taskId}
                  className={styles.taskChip}
                  title={t('files.openLinkedTask')}
                  onClick={() => openLinkedTask(ref.taskId)}
                  style={{ cursor: 'pointer' }}
                >
                  {ref.title}
                </Tag>
              ))}
            </Space>
          )
        }
      },
      {
        title: t('files.colType'),
        key: 'type',
        width: 96,
        sorter: (a, b) =>
          formatFileTypeLabel(a, categoryLabels).localeCompare(
            formatFileTypeLabel(b, categoryLabels),
            undefined,
            { sensitivity: 'base' }
          ),
        sortOrder: activeOrder('type'),
        render: (_: unknown, r: FileMeta) =>
          r.isBookmark ? (
            <Text type="secondary" className={styles.typeMuted}>
              {t('files.bookmarkTypeShort')}
            </Text>
          ) : (
            formatFileTypeLabel(r, categoryLabels)
          )
      },
      {
        title: t('files.colSize'),
        dataIndex: 'size',
        key: 'size',
        width: 72,
        sorter: (a, b) => a.size - b.size,
        sortOrder: activeOrder('size'),
        render: (_: unknown, r: FileMeta) => (r.isBookmark ? '—' : formatSize(r.size))
      },
      {
        title: t('files.colUploaded'),
        dataIndex: 'uploadedAt',
        key: 'uploadedAt',
        width: 132,
        sorter: (a, b) => a.uploadedAt.localeCompare(b.uploadedAt),
        sortOrder: activeOrder('uploadedAt'),
        defaultSortOrder: 'descend',
        render: (_: unknown, r: FileMeta) => formatFileUploadedAt(r.uploadedAt, locale)
      },
      {
        title: t('files.colPreview'),
        key: 'preview',
        width: 64,
        render: (_: unknown, r: FileMeta) => {
          if (r.isBookmark) return '—'
          if (isLocalRemovedPath(r.storagePath)) return t('files.localRemoved')
          if (isRemotePendingPath(r.storagePath)) return t('files.remotePending')
          if (r.previewStatus === 'ready') return t('files.previewReady')
          if (r.previewStatus === 'converting') return t('files.previewConverting')
          if (r.previewStatus === 'failed') return t('files.previewFailed')
          return '—'
        }
      },
      {
        title: t('files.colActions'),
        key: 'actions',
        width: 120,
        render: (_: unknown, r: FileMeta) => {
          if (isRemotePendingPath(r.storagePath)) return null
          if (r.isBookmark) {
            return (
              <Space size={4} onClick={(e) => e.stopPropagation()}>
                <Button
                  type="text"
                  size="small"
                  icon={<LinkOutlined />}
                  aria-label={t('files.openBookmarkExternal')}
                  title={t('files.openBookmarkExternal')}
                  href={r.bookmarkUrl}
                  target="_blank"
                  rel="noreferrer"
                />
              </Space>
            )
          }
          const linked = tasksForFile(r.fileId, deliverableIndex.fileToTasks)
          const unlinkItems: MenuProps['items'] =
            linked.length > 0
              ? linked.map((ref) => ({
                  key: `unlink-${ref.taskId}`,
                  label: `${t('files.unlinkFromTask')}: ${ref.title}`,
                  onClick: () => void handleUnlinkFile(r.fileId, ref.taskId)
                }))
              : []
          return (
            <Space size={4} onClick={(e) => e.stopPropagation()}>
              {!isLocalRemovedPath(r.storagePath) ? (
                <Button
                  type="text"
                  size="small"
                  icon={<DownloadOutlined />}
                  aria-label={t('files.download')}
                  title={t('files.download')}
                  onClick={() => void handleDownload(r)}
                />
              ) : null}
              <Button
                type="text"
                size="small"
                icon={<PaperClipOutlined />}
                aria-label={t('files.linkToTask')}
                title={t('files.linkToTask')}
                onClick={() => openLinkModal(r)}
              />
              {unlinkItems.length > 0 ? (
                <Dropdown menu={{ items: unlinkItems }} trigger={['click']}>
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    aria-label={t('files.unlinkFromTask')}
                    title={t('files.unlinkFromTask')}
                  />
                </Dropdown>
              ) : null}
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={t('files.deleteLocalRun')}
                title={t('files.deleteLocalRun')}
                onClick={() => void handleDeleteLocal(r)}
              />
            </Space>
          )
        }
      }
    ]
  }, [
    t,
    locale,
    categoryLabels,
    sortField,
    sortOrder,
    handleDownload,
    handleDeleteLocal,
    handleUnlinkFile,
    openLinkModal,
    openLinkedTask,
    deliverableIndex.fileToTasks
  ])

  const previewBody = !selected ? null : (
    <>
      <div className={styles.previewHeader}>
        <Text strong ellipsis={{ tooltip: selected.name }}>
          {selected.name}
        </Text>
        <div className={styles.previewMeta}>
          <span>{formatFileTypeLabel(selected, categoryLabels)}</span>
          {!selected.isBookmark && <span>{formatSize(selected.size)}</span>}
          <span>{formatFileUploadedAt(selected.uploadedAt, locale)}</span>
        </div>
        {selected.isBookmark && selected.bookmarkUrl ? (
          <Text
            className={styles.bookmarkUrl}
            type="secondary"
            copyable
            ellipsis={{ tooltip: selected.bookmarkUrl }}
          >
            {selected.bookmarkUrl}
          </Text>
        ) : null}
      </div>
      <div className={styles.previewActions}>
        {selected.isBookmark ? (
          <>
            <Button
              type="primary"
              size="small"
              icon={<LinkOutlined />}
              href={selected.bookmarkUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('files.openBookmarkExternal')}
            </Button>
            <Button
              size="small"
              icon={<CommentOutlined />}
              loading={sharingToChat}
              onClick={handleShareToChat}
            >
              {t('files.shareToChat')}
            </Button>
          </>
        ) : (
          <>
            {isRemotePendingPath(selected.storagePath) ? (
              <Button
                type="primary"
                size="small"
                loading={pulling}
                onClick={() => void handlePullRemote()}
              >
                {resumableDownload ? t('files.pullRemoteResume') : t('files.pullRemote')}
              </Button>
            ) : null}
            {!isRemotePendingPath(selected.storagePath) ? (
              <Button
                size="small"
                icon={<DownloadOutlined />}
                loading={downloading}
                onClick={() => void handleDownload(selected)}
              >
                {t('files.download')}
              </Button>
            ) : null}
            <Button
              size="small"
              icon={<CommentOutlined />}
              loading={sharingToChat}
              onClick={handleShareToChat}
            >
              {t('files.shareToChat')}
            </Button>
            <Button
              size="small"
              icon={<PaperClipOutlined />}
              onClick={() => openLinkModal(selected)}
            >
              {t('files.linkToTask')}
            </Button>
          </>
        )}
      </div>
      {selected && !selected.isBookmark
        ? (() => {
            const linked = tasksForFile(selected.fileId, deliverableIndex.fileToTasks)
            if (linked.length === 0) return null
            return (
              <Space size={[4, 4]} wrap className={styles.linkedTasksRow}>
                {linked.map((ref) => (
                  <Tag
                    key={ref.taskId}
                    closable
                    title={t('files.openLinkedTask')}
                    onClick={() => openLinkedTask(ref.taskId)}
                    style={{ cursor: 'pointer' }}
                    onClose={(e) => {
                      e.preventDefault()
                      void handleUnlinkFile(selected.fileId, ref.taskId)
                    }}
                  >
                    {ref.title}
                  </Tag>
                ))}
              </Space>
            )
          })()
        : null}
      {selected.isBookmark ? (
        <div className={styles.bookmarkPreviewWrap}>
          <Text type="secondary" className={styles.bookmarkPreviewHint}>
            {t('files.bookmarkPreviewHint')}
          </Text>
          <BookmarkWebView
            url={selected.bookmarkUrl ?? ''}
            title={selected.bookmarkTitle ?? selected.name}
          />
        </div>
      ) : isRemotePendingPath(selected.storagePath) ? (
        <Text type="secondary">
          {resumableDownload
            ? t('files.remotePartialHint', {
                received: formatSize(resumableDownload.transferredBytes),
                total: formatSize(resumableDownload.totalBytes)
              })
            : t('files.remotePending')}
        </Text>
      ) : isLocalRemovedPath(selected.storagePath) ? (
        <Text type="secondary">{t('files.localRemoved')}</Text>
      ) : selected.previewStatus === 'converting' ? (
        <Text>{t('files.convertingLocal')}</Text>
      ) : previewLoading ? (
        <ViewLoadingCenter />
      ) : previewError ? (
        <ViewErrorCenter message={t('files.previewLoadFailed')} onRetry={retryPreview} />
      ) : selected.previewStatus === 'failed' ? (
        <Text type="danger">{t('files.previewFailedDownload')}</Text>
      ) : previewUrl && ['mp4', 'webm'].includes(selected.ext.toLowerCase()) ? (
        <video
          src={previewUrl}
          controls
          className={styles.previewVideo}
          aria-label={selected.name}
        />
      ) : previewUrl && selected.category === 'image' ? (
        <Image src={previewUrl} alt={selected.name} className={styles.previewImg} />
      ) : previewUrl && selected.ext.toLowerCase() === 'pdf' ? (
        <iframe title={selected.name} src={previewUrl} className={styles.previewFrame} />
      ) : previewText !== null ? (
        <pre className={styles.previewText}>{previewText}</pre>
      ) : (
        <Text type="secondary">{t('files.noInlinePreview', { name: selected.name })}</Text>
      )}
    </>
  )

  return (
    <div className={styles.root}>
      <ViewToolbar
        start={
          <ViewSegment
            value={category}
            options={categories}
            onChange={(v) => setCategory(v as FileCategory | 'all')}
            scrollable
            equalWidth={false}
            ariaLabel={t('files.categoryFilter')}
          />
        }
        end={
          <div className={styles.toolbarPrimary}>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() =>
                void upload(gid).catch((err: unknown) =>
                  message.error(formatError(err, 'files.uploadFailed'))
                )
              }
            >
              {t('files.upload')}
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => setBookmarkOpen(true)}>
              {t('files.addBookmark')}
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'import',
                    icon: <ImportOutlined />,
                    label: t('files.importBookmarks'),
                    onClick: () => void handleImportBookmarks()
                  },
                  {
                    key: 'export',
                    icon: <ExportOutlined />,
                    label: t('files.exportBookmarks'),
                    onClick: () => void handleExportBookmarks()
                  }
                ] satisfies MenuProps['items']
              }}
              trigger={['click']}
            >
              <Button icon={<MoreOutlined />} aria-label={t('files.bookmarkMoreAria')}>
                {t('files.bookmarkMore')}
              </Button>
            </Dropdown>
          </div>
        }
      />

      <PluginZoneHost zone="toolbar" context={{ groupId: gid, view: 'files' }} />

      <div className={styles.searchRow}>
        <ViewSegment
          value={libraryScope}
          options={libraryScopeOptions}
          onChange={(v) => {
            setLibraryScope(v)
            if (v === 'all') setTaskFilterId(null)
          }}
          equalWidth={false}
          ariaLabel={t('files.scopeFilter')}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className={styles.taskFilterSelect}
          placeholder={t('files.taskFilterPlaceholder')}
          value={taskFilterId ?? undefined}
          options={taskFilterOptions}
          onChange={(v) => {
            const next = v ? String(v) : null
            setTaskFilterId(next)
            if (next) setLibraryScope('deliverables')
          }}
        />
        <Input.Search
          className={styles.searchInput}
          allowClear
          placeholder={t('files.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery.trim() ? (
          <Text type="secondary">{t('files.searchResultCount', { count: filteredFiles.length })}</Text>
        ) : null}
      </div>

      {!isExpanded ? (
        <div className={styles.transferPanelCompact} onClick={() => setTransferPanelExpanded(true)}>
          <div className={styles.transferCompactContent}>
            <SettingOutlined className={styles.transferCompactIcon} />
            <span className={styles.transferCompactText}>
              {t('files.transferHistory')} · {t('files.rateLimitKbps')}
            </span>
            {transferSettings?.rateKbps ? (
              <Tag color="warning" bordered={false} className={styles.transferCompactTag}>
                {t('files.rateLimitKbps')}: {transferSettings.rateKbps} KB/s
              </Tag>
            ) : (
              <Tag color="default" bordered={false} className={styles.transferCompactTag}>
                {t('files.rateLimitHint')}
              </Tag>
            )}
          </div>
          <RegionButton variant="caption" className={styles.transferCompactBtn}>
            {t('files.transferExpand')}
          </RegionButton>
        </div>
      ) : (
        <div className={styles.transferPanel}>
          <div className={styles.transferHeaderRow}>
            <div className={styles.rateLimitRow}>
              <Text type="secondary">
                {t('files.rateLimitKbps')} · {t('files.rateLimitHint')}
              </Text>
              <InputNumber
                min={0}
                step={128}
                value={transferSettings?.rateKbps ?? 0}
                onChange={(v) => {
                  if (v === null) return
                  void setTransferRate(v).catch(() => undefined)
                }}
                style={{ width: 120 }}
                size="small"
                aria-label={t('files.rateLimitKbps')}
              />
            </div>
            {activeTransfers.length === 0 && (
              <RegionButton
                variant="caption"
                onClick={(e) => {
                  e.stopPropagation()
                  setTransferPanelExpanded(false)
                }}
                className={styles.transferCollapseBtn}
              >
                {t('files.transferCollapse')}
              </RegionButton>
            )}
          </div>
          {activeTransfers.length > 0 && (
            <List
              size="small"
              className={styles.transferList}
              header={<Text type="secondary">{t('files.transferQueue')}</Text>}
              dataSource={activeTransfers}
              renderItem={(tr) => (
                <List.Item>
                  <TransferActiveRow
                    tr={tr}
                    statusLabel={t(TRANSFER_STATUS_KEYS[tr.status] ?? 'files.transferFailed')}
                    localQueueLabel={t('files.transferLocalQueue')}
                    cancelLabel={t('files.transferCancel')}
                    onCancel={handleCancel}
                  />
                </List.Item>
              )}
            />
          )}
          {transferHistory.length > 0 && (
            <Collapse
              className={styles.transferHistory}
              items={[
                {
                  key: 'history',
                  label: `${t('files.transferHistory')} (${transferHistory.length})`,
                  children: (
                    <List
                      size="small"
                      dataSource={transferHistory}
                      renderItem={(tr) => (
                        <List.Item
                          actions={
                            isResumableTransfer(tr)
                              ? [
                                  <RegionButton
                                    key="retry"
                                    variant="caption"
                                    onClick={() => handleResume(tr.transferId)}
                                  >
                                    {t('files.transferRetry')}
                                  </RegionButton>
                                ]
                              : undefined
                          }
                        >
                          <div className={styles.transferRow}>
                            <span>{tr.fileName}</span>
                            <Tag color="default" bordered={false}>
                              {tr.direction === 'download'
                                ? t('files.transferDownload')
                                : t('files.transferUpload')}
                            </Tag>
                            <Text type="secondary" style={{ flex: 1, margin: '0 12px' }}>
                              {formatSize(tr.transferredBytes)} / {formatSize(tr.totalBytes)}
                            </Text>
                            <TagStatus
                              status={tr.status}
                              label={t(TRANSFER_STATUS_KEYS[tr.status] ?? 'files.transferFailed')}
                            />
                          </div>
                        </List.Item>
                      )}
                    />
                  )
                }
              ]}
            />
          )}
        </div>
      )}

      <IslandPanel
        hideHeader
        aria-label={t('nav.files')}
        className={styles.filesIsland}
        bodyClassName={isNarrow ? `${styles.body} ${styles.bodyNarrow}` : styles.body}
        data-testid="files-island-surface"
      >
        <div className={styles.listPane}>
          {loading && files.length === 0 ? (
            <ViewLoadingCenter />
          ) : (
            <Table
              size="small"
              rowKey="fileId"
              columns={columns}
              dataSource={filteredFiles}
              locale={{
                emptyText: (
                  <div className={styles.emptyState}>
                    <ViewEmptyIcon icon={<InboxOutlined />} />
                    <Text type="secondary">
                      {searchQuery.trim()
                        ? t('files.emptySearch')
                        : taskFilterId
                          ? t('files.emptyTaskDeliverables')
                          : libraryScope === 'deliverables'
                            ? t('files.emptyDeliverables')
                            : category !== 'all'
                              ? t('files.emptyCategory')
                              : t('files.empty')}
                    </Text>
                    <Space wrap className={styles.emptyActions}>
                      <Button
                        type="primary"
                        size="small"
                        icon={<UploadOutlined />}
                        onClick={() =>
                          void upload(gid).catch((err: unknown) =>
                            message.error(formatError(err, 'files.uploadFailed'))
                          )
                        }
                      >
                        {t('files.upload')}
                      </Button>
                      <Button size="small" icon={<PlusOutlined />} onClick={() => setBookmarkOpen(true)}>
                        {t('files.addBookmark')}
                      </Button>
                    </Space>
                  </div>
                )
              }}
              pagination={false}
              sortDirections={['ascend', 'descend']}
              onChange={handleTableChange}
              onRow={(record) => ({
                onClick: () => {
                  setSelected(record)
                  if (isNarrow) setPreviewDrawerOpen(true)
                }
              })}
              rowClassName={(record) =>
                [
                  record.isBookmark ? styles.rowBookmark : '',
                  record.fileId === selected?.fileId ? styles.rowSelected : ''
                ]
                  .filter(Boolean)
                  .join(' ')
              }
            />
          )}
        </div>
        {!isNarrow ? (
          <aside className={styles.previewPane}>
            {!selected ? (
              <ViewEmptyHint
                className={styles.previewEmptyFill}
                icon={<FileSearchOutlined />}
              >
                {t('files.selectToPreview')}
              </ViewEmptyHint>
            ) : (
              previewBody
            )}
          </aside>
        ) : null}
      </IslandPanel>

      <Drawer
        title={selected?.name ?? t('files.previewDrawerTitle')}
        placement="bottom"
        height="78%"
        open={isNarrow && previewDrawerOpen && selected !== null}
        onClose={() => setPreviewDrawerOpen(false)}
        destroyOnHidden={false}
        className={styles.previewDrawer}
        styles={{ body: { paddingTop: 12 } }}
        zIndex={1100}
      >
        {selected ? previewBody : null}
      </Drawer>

      <Modal
        title={t('files.bookmarkModalTitle')}
        open={bookmarkOpen}
        onCancel={() => setBookmarkOpen(false)}
        onOk={() => void saveBookmark()}
        confirmLoading={bookmarkSaving}
        destroyOnHidden
        zIndex={1200}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary">{t('common.url')}</Text>
            <Input
              placeholder={t('files.bookmarkUrlPlaceholder')}
              value={bookmarkUrl}
              onChange={(e) => setBookmarkUrl(e.target.value)}
              onPressEnter={runOnEnter(() => void saveBookmark())}
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Text type="secondary">{t('common.titleOptional')}</Text>
            <Input
              placeholder={t('files.bookmarkTitlePlaceholder')}
              value={bookmarkTitle}
              onChange={(e) => setBookmarkTitle(e.target.value)}
              onPressEnter={runOnEnter(() => void saveBookmark())}
              style={{ marginTop: 4 }}
            />
          </div>
        </Space>
      </Modal>

      <Modal
        open={linkFileModal != null}
        title={t('files.linkToTaskTitle')}
        okText={t('files.linkToTaskConfirm')}
        cancelText={t('common.cancel')}
        confirmLoading={linkSaving}
        okButtonProps={{ disabled: !linkTaskId }}
        onCancel={() => {
          setLinkFileModal(null)
          setLinkTaskId(undefined)
        }}
        onOk={() => void handleConfirmLinkFile()}
      >
        <Text type="secondary">
          {linkFileModal ? t('files.linkToTaskHint', { name: linkFileModal.fileName }) : null}
        </Text>
        <Select
          style={{ width: '100%', marginTop: 12 }}
          placeholder={t('files.linkToTaskPick')}
          value={linkTaskId}
          onChange={setLinkTaskId}
          options={tasks
            .filter((task) => !task.deletedAt)
            .map((task) => ({ value: task.taskId, label: task.title }))}
          showSearch
          optionFilterProp="label"
        />
      </Modal>
    </div>
  )
}

function TagStatus({ status, label }: { status: string; label: string }): React.ReactElement {
  return <Text type="secondary">{label || status}</Text>
}
