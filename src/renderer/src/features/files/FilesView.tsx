import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Image,
  Input,
  List,
  Modal,
  Progress,
  Space,
  Table,
  Typography
} from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { CommentOutlined, ExportOutlined, ImportOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { FileCategory, FileMeta } from '@shared/file/types'
import { useFileStore } from '@renderer/stores/fileStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import ViewToolbar, { ViewToolbarGroup } from '@renderer/ui/ViewToolbar'
import ViewSegment from '@renderer/ui/ViewSegment'
import { ViewErrorCenter, ViewLoadingCenter } from '@renderer/ui/ViewState'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { groupViewPath } from '@renderer/routes/paths'
import BookmarkWebView from '@renderer/features/files/BookmarkWebView'
import { loadPreviewText } from '@renderer/features/files/loadPreviewText'
import styles from './files.module.css'

const { Text } = Typography

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
  failed: 'files.transferFailed'
}

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function FilesView(): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const navigate = useNavigate()
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const files = useFileStore((s) => s.filesByGroup[gid] ?? [])
  const transfers = useFileStore((s) => s.transfersByGroup[gid] ?? [])
  const loading = useFileStore((s) => s.loading[gid])
  const loadFiles = useFileStore((s) => s.loadFiles)
  const loadTransfers = useFileStore((s) => s.loadTransfers)
  const upload = useFileStore((s) => s.upload)
  const addBookmark = useFileStore((s) => s.addBookmark)
  const importBookmarks = useFileStore((s) => s.importBookmarks)
  const exportBookmarks = useFileStore((s) => s.exportBookmarks)

  const [category, setCategory] = useState<FileCategory | 'all'>('all')
  const [selected, setSelected] = useState<FileMeta | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState(false)
  const [bookmarkOpen, setBookmarkOpen] = useState(false)
  const [bookmarkUrl, setBookmarkUrl] = useState('')
  const [bookmarkTitle, setBookmarkTitle] = useState('')
  const [bookmarkSaving, setBookmarkSaving] = useState(false)

  const categories = useMemo(
    () => CATEGORY_KEYS.map((c) => ({ label: t(c.key), value: c.value })),
    [t]
  )

  useEffect(() => {
    if (!gid) return
    void loadFiles(gid, category === 'all' ? undefined : category)
    void loadTransfers(gid)
    const unsub = getLanpmApi().file.onTransfersChanged((changed) => {
      if (changed === gid) {
        void loadTransfers(gid)
        void loadFiles(gid, category === 'all' ? undefined : category)
      }
    })
    return unsub
  }, [gid, category, loadFiles, loadTransfers])

  useEffect(() => {
    if (!selected) {
      setPreviewUrl(null)
      setPreviewText(null)
      setPreviewError(false)
      return
    }
    if (selected.isBookmark) {
      setPreviewUrl(null)
      setPreviewText(null)
      setPreviewError(false)
      return
    }

    const ext = selected.ext.toLowerCase()
    const isTextPreview = ['txt', 'md', 'json'].includes(ext)

    setPreviewError(false)
    if (isTextPreview) {
      setPreviewUrl(null)
      void loadPreviewText(selected.fileId)
        .then((text) => {
          setPreviewText(text)
          setPreviewError(text === null)
        })
        .catch(() => {
          setPreviewText(null)
          setPreviewError(true)
        })
      return
    }

    setPreviewText(null)
    void getLanpmApi()
      .file.getPreviewUrl(selected.fileId)
      .then((url) => {
        setPreviewUrl(url)
        setPreviewError(!url)
      })
      .catch(() => {
        setPreviewUrl(null)
        setPreviewError(true)
      })
  }, [selected])

  const retryPreview = (): void => {
    if (!selected || selected.isBookmark) return
    setPreviewError(false)
    const ext = selected.ext.toLowerCase()
    if (['txt', 'md', 'json'].includes(ext)) {
      void loadPreviewText(selected.fileId)
        .then((text) => {
          setPreviewText(text)
          setPreviewError(text === null)
        })
        .catch(() => setPreviewError(true))
      return
    }
    void getLanpmApi()
      .file.getPreviewUrl(selected.fileId)
      .then((url) => {
        setPreviewUrl(url)
        setPreviewError(!url)
      })
      .catch(() => setPreviewError(true))
  }

  const handleShareToChat = (): void => {
    if (!selected || !gid) return
    const draft = selected.isBookmark
      ? t('files.shareBookmarkDraft', {
          title: selected.bookmarkTitle ?? selected.name,
          url: selected.bookmarkUrl ?? ''
        })
      : t('files.shareFileDraft', { name: selected.name })
    navigate(groupViewPath(gid, 'chat'), { state: { composeDraft: draft } })
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
      message.error(err instanceof Error ? err.message : t('files.bookmarkAddFailed'))
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
      message.error(err instanceof Error ? err.message : t('files.importFailed'))
    }
  }

  const handleExportBookmarks = async (): Promise<void> => {
    if (!gid) return
    try {
      const path = await exportBookmarks(gid)
      if (path) message.success(t('files.exportedTo', { path }))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('files.exportFailed'))
    }
  }

  const activeTransfers = useMemo(
    () => transfers.filter((tr) => tr.status === 'queued' || tr.status === 'transferring'),
    [transfers]
  )

  const columns = useMemo(
    () => [
      { title: t('files.colName'), dataIndex: 'name', key: 'name', ellipsis: true },
      { title: t('files.colType'), dataIndex: 'category', key: 'category', width: 80 },
      {
        title: t('files.colSize'),
        key: 'size',
        width: 90,
        render: (_: unknown, r: FileMeta) => (r.isBookmark ? '—' : formatSize(r.size))
      },
      {
        title: t('files.colPreview'),
        key: 'preview',
        width: 90,
        render: (_: unknown, r: FileMeta) => {
          if (r.isBookmark) return t('common.link')
          if (r.previewStatus === 'ready') return t('files.previewReady')
          if (r.previewStatus === 'converting') return t('files.previewConverting')
          if (r.previewStatus === 'failed') return t('files.previewFailed')
          return '—'
        }
      }
    ],
    [t]
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
          <ViewToolbarGroup>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() =>
                void upload(gid).catch((err: unknown) =>
                  message.error(err instanceof Error ? err.message : t('files.uploadFailed'))
                )
              }
            >
              {t('files.upload')}
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => setBookmarkOpen(true)}>
              {t('files.addBookmark')}
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => void handleImportBookmarks()}>
              {t('files.importBookmarks')}
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => void handleExportBookmarks()}>
              {t('files.exportBookmarks')}
            </Button>
          </ViewToolbarGroup>
        }
      />

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
                <TagStatus status={tr.status} label={t(TRANSFER_STATUS_KEYS[tr.status] ?? 'files.transferFailed')} />
              </div>
            </List.Item>
          )}
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
              dataSource={files}
              locale={{ emptyText: t('files.empty') }}
              pagination={false}
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
              <div className={styles.previewActions}>
                <Button
                  type="primary"
                  size="small"
                  icon={<CommentOutlined />}
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
              ) : selected.previewStatus === 'converting' ? (
            <Text>{t('files.convertingLocal')}</Text>
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
