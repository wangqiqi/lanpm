import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Image,
  Input,
  List,
  Modal,
  Progress,
  Segmented,
  Space,
  Table,
  Typography,
  message
} from 'antd'
import { BookOutlined, ExportOutlined, ImportOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import type { FileCategory, FileMeta } from '@shared/file/types'
import { useFileStore } from '@renderer/stores/fileStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import ViewToolbar, { ViewToolbarGroup } from '@renderer/ui/ViewToolbar'
import { ViewLoadingCenter } from '@renderer/ui/ViewState'
import styles from './files.module.css'

const { Text } = Typography

const CATEGORIES: { label: string; value: FileCategory | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '文档', value: 'document' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '代码', value: 'code' },
  { label: '书签', value: 'bookmark' },
  { label: '其他', value: 'other' }
]

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function FilesView(): React.ReactElement {
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
  const [bookmarkOpen, setBookmarkOpen] = useState(false)
  const [bookmarkUrl, setBookmarkUrl] = useState('')
  const [bookmarkTitle, setBookmarkTitle] = useState('')
  const [bookmarkSaving, setBookmarkSaving] = useState(false)

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
      return
    }
    if (selected.isBookmark) {
      setPreviewUrl(null)
      return
    }
    void getLanpmApi()
      .file.getPreviewUrl(selected.fileId)
      .then(setPreviewUrl)
      .catch(() => setPreviewUrl(null))
  }, [selected])

  const saveBookmark = async (): Promise<void> => {
    if (!gid) return
    setBookmarkSaving(true)
    try {
      await addBookmark(gid, bookmarkUrl.trim(), bookmarkTitle.trim())
      message.success('书签已添加')
      setBookmarkOpen(false)
      setBookmarkUrl('')
      setBookmarkTitle('')
      setCategory('bookmark')
      void loadFiles(gid, 'bookmark')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '添加书签失败')
    } finally {
      setBookmarkSaving(false)
    }
  }

  const handleImportBookmarks = async (): Promise<void> => {
    if (!gid) return
    try {
      const imported = await importBookmarks(gid)
      if (imported.length === 0) {
        message.info('未导入书签')
        return
      }
      message.success(`已导入 ${imported.length} 个书签`)
      setCategory('bookmark')
      void loadFiles(gid, 'bookmark')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导入失败')
    }
  }

  const handleExportBookmarks = async (): Promise<void> => {
    if (!gid) return
    try {
      const path = await exportBookmarks(gid)
      if (path) message.success(`已导出至 ${path}`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导出失败')
    }
  }

  const activeTransfers = useMemo(
    () => transfers.filter((t) => t.status === 'queued' || t.status === 'transferring'),
    [transfers]
  )

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '类型', dataIndex: 'category', key: 'category', width: 80 },
    { title: '大小', key: 'size', width: 90, render: (_: unknown, r: FileMeta) => (r.isBookmark ? '—' : formatSize(r.size)) },
    {
      title: '预览',
      key: 'preview',
      width: 90,
      render: (_: unknown, r: FileMeta) =>
        r.isBookmark ? '链接' : r.previewStatus === 'ready' ? '就绪' : r.previewStatus === 'converting' ? '转换中' : r.previewStatus === 'failed' ? '失败' : '—'
    }
  ]

  return (
    <div className={styles.root}>
      <ViewToolbar
        start={
          <Segmented
            options={CATEGORIES.map((c) => ({ label: c.label, value: c.value }))}
            value={category}
            onChange={(v) => setCategory(v as FileCategory | 'all')}
          />
        }
        end={
          <ViewToolbarGroup>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() =>
                void upload(gid).catch((err: unknown) =>
                  message.error(err instanceof Error ? err.message : '上传失败')
                )
              }
            >
              上传文件
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => setBookmarkOpen(true)}>
              添加书签
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => void handleImportBookmarks()}>
              导入书签
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => void handleExportBookmarks()}>
              导出书签
            </Button>
          </ViewToolbarGroup>
        }
      />

      {activeTransfers.length > 0 && (
        <List
          size="small"
          className={styles.transferList}
          header={<Text type="secondary">传输队列（最多 3 路并发）</Text>}
          dataSource={activeTransfers}
          renderItem={(t) => (
            <List.Item>
              <div className={styles.transferRow}>
                <span>{t.fileName}</span>
                <Progress
                  percent={Math.round((t.transferredBytes / Math.max(1, t.totalBytes)) * 100)}
                  size="small"
                  style={{ flex: 1, margin: '0 12px' }}
                />
                <TagStatus status={t.status} />
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
            <Text type="secondary">选择文件查看预览</Text>
          ) : selected.isBookmark ? (
            <div className={styles.bookmarkPreview}>
              <BookOutlined style={{ fontSize: 32, marginBottom: 12 }} />
              <Text strong>{selected.bookmarkTitle ?? selected.name}</Text>
              <a href={selected.bookmarkUrl} target="_blank" rel="noreferrer">
                {selected.bookmarkUrl}
              </a>
            </div>
          ) : selected.previewStatus === 'converting' ? (
            <Text>本地转换中…（LibreOffice）</Text>
          ) : selected.previewStatus === 'failed' ? (
            <Text type="danger">预览失败，请下载原文件</Text>
          ) : previewUrl && selected.category === 'image' ? (
            <Image src={previewUrl} alt={selected.name} className={styles.previewImg} />
          ) : previewUrl && selected.ext.toLowerCase() === 'pdf' ? (
            <iframe title={selected.name} src={previewUrl} className={styles.previewFrame} />
          ) : previewUrl && ['txt', 'md', 'json'].includes(selected.ext.toLowerCase()) ? (
            <iframe title={selected.name} src={previewUrl} className={styles.previewFrame} />
          ) : (
            <Text type="secondary">暂不支持内联预览：{selected.name}</Text>
          )}
        </aside>
      </div>

      <Modal
        title="添加书签"
        open={bookmarkOpen}
        onCancel={() => setBookmarkOpen(false)}
        onOk={() => void saveBookmark()}
        confirmLoading={bookmarkSaving}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary">URL</Text>
            <Input
              placeholder="https://example.com"
              value={bookmarkUrl}
              onChange={(e) => setBookmarkUrl(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Text type="secondary">标题（可选）</Text>
            <Input
              placeholder="书签标题"
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

function TagStatus({ status }: { status: string }): React.ReactElement {
  const map: Record<string, string> = {
    queued: '排队',
    transferring: '传输中',
    completed: '完成',
    failed: '失败'
  }
  return <Text type="secondary">{map[status] ?? status}</Text>
}
