import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Collapse,
  Image,
  Input,
  InputNumber,
  List,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Typography
} from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { ColumnsType, TableProps } from 'antd/es/table'
import {
  CommentOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  UploadOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import type { FileCategory, FileMeta } from '@shared/file/types'
import { isLocalRemovedPath, isRemotePendingPath } from '@shared/file/sync'
import { useFileStore } from '@renderer/stores/fileStore'
import { useChatStore } from '@renderer/stores/chatStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import ViewToolbar from '@renderer/ui/ViewToolbar'
import ViewSegment from '@renderer/ui/ViewSegment'
import { ViewErrorCenter, ViewLoadingCenter } from '@renderer/ui/ViewState'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { groupViewPath } from '@renderer/routes/paths'
import BookmarkWebView from '@renderer/features/files/BookmarkWebView'
import { formatFileTypeLabel } from '@shared/file/formatFileType'
import {
  CATEGORY_I18N_KEYS,
  filterFiles,
  formatFileUploadedAt,
  type FileSortField,
  type FileSortOrder
} from '@renderer/features/files/fileListModel'
import { isTextPreviewFile } from '@shared/file/previewExtensions'
import { loadPreviewText } from '@renderer/features/files/loadPreviewText'
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
  paused: 'files.transferPaused'
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
  const upload = useFileStore((s) => s.upload)
  const addBookmark = useFileStore((s) => s.addBookmark)
  const importBookmarks = useFileStore((s) => s.importBookmarks)
  const exportBookmarks = useFileStore((s) => s.exportBookmarks)
  const pullRemote = useFileStore((s) => s.pullRemote)
  const download = useFileStore((s) => s.download)
  const sendExistingFile = useChatStore((s) => s.sendExistingFile)

  const [category, setCategory] = useState<FileCategory | 'all'>('all')
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

  const categories = useMemo(
    () => CATEGORY_KEYS.map((c) => ({ label: t(c.key), value: c.value })),
    [t]
  )

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

  const filteredFiles = useMemo(
    () => filterFiles(files, searchQuery),
    [files, searchQuery]
  )

  useEffect(() => {
    consumedSelectFileIdRef.current = null
  }, [gid])

  useEffect(() => {
    const state = location.state as { selectFileId?: string } | null
    const targetId = state?.selectFileId
    if (!targetId || !gid) return
    if (consumedSelectFileIdRef.current === targetId) return
    const match = files.find((f) => f.fileId === targetId)
    if (!match) return
    consumedSelectFileIdRef.current = targetId
    setSelected(match)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate, files, gid])

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
  }, [gid, category, loadFiles, loadTransfers, loadTransferHistory, loadTransferSettings])

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
    setPulling(true)
    try {
      const meta = await pullRemote(gid, selected.fileId)
      setSelected(meta)
      message.success(t('files.previewReady'))
    } catch (err) {
      message.error(formatError(err, 'files.pullRemoteFailed'))
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

  const handleResume = (transferId: string): void => {
    void resumeTransfer(gid, transferId).catch((err: unknown) =>
      message.error(formatError(err, 'files.transferResumeFailed'))
    )
  }

  const columns = useMemo((): ColumnsType<FileMeta> => {
    const activeOrder = (field: FileSortField) => (sortField === field ? sortOrder : null)
    return [
      {
        title: t('files.colName'),
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        sorter: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        sortOrder: activeOrder('name')
      },
      {
        title: t('files.colType'),
        key: 'type',
        width: 112,
        sorter: (a, b) =>
          formatFileTypeLabel(a, categoryLabels).localeCompare(
            formatFileTypeLabel(b, categoryLabels),
            undefined,
            { sensitivity: 'base' }
          ),
        sortOrder: activeOrder('type'),
        render: (_: unknown, r: FileMeta) => formatFileTypeLabel(r, categoryLabels)
      },
      {
        title: t('files.colSize'),
        dataIndex: 'size',
        key: 'size',
        width: 88,
        sorter: (a, b) => a.size - b.size,
        sortOrder: activeOrder('size'),
        render: (_: unknown, r: FileMeta) => (r.isBookmark ? '—' : formatSize(r.size))
      },
      {
        title: t('files.colUploaded'),
        dataIndex: 'uploadedAt',
        key: 'uploadedAt',
        width: 148,
        sorter: (a, b) => a.uploadedAt.localeCompare(b.uploadedAt),
        sortOrder: activeOrder('uploadedAt'),
        defaultSortOrder: 'descend',
        render: (_: unknown, r: FileMeta) => formatFileUploadedAt(r.uploadedAt, locale)
      },
      {
        title: t('files.colPreview'),
        key: 'preview',
        width: 72,
        render: (_: unknown, r: FileMeta) => {
          if (r.isBookmark) return t('common.link')
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
        width: 88,
        render: (_: unknown, r: FileMeta) =>
          r.isBookmark || isRemotePendingPath(r.storagePath) ? null : (
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
                danger
                icon={<DeleteOutlined />}
                aria-label={t('files.deleteLocalRun')}
                title={t('files.deleteLocalRun')}
                onClick={() => void handleDeleteLocal(r)}
              />
            </Space>
          )
      }
    ]
  }, [t, locale, categoryLabels, sortField, sortOrder, handleDownload, handleDeleteLocal])

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
          <>
            <div className={styles.toolbarPrimary}>
              <Space size="small" align="center">
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
                  aria-label={t('files.rateLimitKbps')}
                />
              </Space>
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
            </div>
            <span className={styles.toolbarDivider} aria-hidden />
            <div className={styles.toolbarSecondary}>
              <Button icon={<PlusOutlined />} onClick={() => setBookmarkOpen(true)}>
                {t('files.addBookmark')}
              </Button>
              <Button icon={<ImportOutlined />} onClick={() => void handleImportBookmarks()}>
                {t('files.importBookmarks')}
              </Button>
              <Button icon={<ExportOutlined />} onClick={() => void handleExportBookmarks()}>
                {t('files.exportBookmarks')}
              </Button>
            </div>
          </>
        }
      />

      <div className={styles.searchRow}>
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

      {activeTransfers.length > 0 && (
        <List
          size="small"
          className={styles.transferList}
          header={<Text type="secondary">{t('files.transferQueue')}</Text>}
          dataSource={activeTransfers}
          renderItem={(tr) => (
            <List.Item>
              <div className={styles.transferRow}>
                <span>{tr.fileName}</span>
                <Progress
                  percent={Math.round((tr.transferredBytes / Math.max(1, tr.totalBytes)) * 100)}
                  size="small"
                  style={{ flex: 1, margin: '0 12px' }}
                />
                {tr.fromDeviceId === tr.toDeviceId ? (
                  <Tag color="default">{t('files.transferLocalQueue')}</Tag>
                ) : null}
                <TagStatus status={tr.status} label={t(TRANSFER_STATUS_KEYS[tr.status] ?? 'files.transferFailed')} />
              </div>
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
                        tr.status === 'failed' || tr.status === 'paused'
                          ? [
                              <Button
                                key="resume"
                                type="link"
                                size="small"
                                onClick={() => handleResume(tr.transferId)}
                              >
                                {t('files.transferResume')}
                              </Button>
                            ]
                          : undefined
                      }
                    >
                      <div className={styles.transferRow}>
                        <span>{tr.fileName}</span>
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

      <div className={styles.body}>
        <div className={styles.listPane}>
          {loading && files.length === 0 ? (
            <ViewLoadingCenter />
          ) : (
            <Table
              size="small"
              rowKey="fileId"
              columns={columns}
              dataSource={filteredFiles}
              locale={{ emptyText: t('files.empty') }}
              pagination={false}
              sortDirections={['ascend', 'descend']}
              onChange={handleTableChange}
              onRow={(record) => ({
                onClick: () => setSelected(record)
              })}
              rowClassName={(record) =>
                record.fileId === selected?.fileId ? styles.rowSelected : ''
              }
            />
          )}
        </div>
        <aside className={styles.previewPane}>
          {!selected ? (
            <Text type="secondary">{t('files.selectToPreview')}</Text>
          ) : (
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
              </div>
              <div className={styles.previewActions}>
                {selected && !selected.isBookmark && isRemotePendingPath(selected.storagePath) ? (
                  <Button type="primary" size="small" loading={pulling} onClick={() => void handlePullRemote()}>
                    {t('files.pullRemote')}
                  </Button>
                ) : null}
                {!selected.isBookmark && !isRemotePendingPath(selected.storagePath) ? (
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
                  type="primary"
                  size="small"
                  icon={<CommentOutlined />}
                  loading={sharingToChat}
                  onClick={handleShareToChat}
                >
                  {t('files.shareToChat')}
                </Button>
              </div>
              {selected.isBookmark ? (
                <div className={styles.bookmarkPreviewWrap}>
                  <BookmarkWebView
                    url={selected.bookmarkUrl ?? ''}
                    title={selected.bookmarkTitle ?? selected.name}
                  />
                  <a
                    className={styles.bookmarkExternalLink}
                    href={selected.bookmarkUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('files.openBookmarkExternal')}
                  </a>
                </div>
              ) : isRemotePendingPath(selected.storagePath) ? (
                <Text type="secondary">{t('files.remotePending')}</Text>
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
          )}
        </aside>
      </div>

      <Modal
        title={t('files.bookmarkModalTitle')}
        open={bookmarkOpen}
        onCancel={() => setBookmarkOpen(false)}
        onOk={() => void saveBookmark()}
        confirmLoading={bookmarkSaving}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary">{t('common.url')}</Text>
            <Input
              placeholder={t('files.bookmarkUrlPlaceholder')}
              value={bookmarkUrl}
              onChange={(e) => setBookmarkUrl(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Text type="secondary">{t('common.titleOptional')}</Text>
            <Input
              placeholder={t('files.bookmarkTitlePlaceholder')}
              value={bookmarkTitle}
              onChange={(e) => setBookmarkTitle(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}

function TagStatus({ status, label }: { status: string; label: string }): React.ReactElement {
  return <Text type="secondary">{label || status}</Text>
}
