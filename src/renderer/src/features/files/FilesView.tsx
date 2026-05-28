import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Image,
  List,
  Progress,
  Segmented,
  Spin,
  Table,
  Typography,
  message
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import type { FileCategory, FileMeta } from '@shared/file/types'
import { useFileStore } from '@renderer/stores/fileStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import styles from './files.module.css'

const { Text } = Typography

const CATEGORIES: { label: string; value: FileCategory | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '文档', value: 'document' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '代码', value: 'code' },
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

  const [category, setCategory] = useState<FileCategory | 'all'>('all')
  const [selected, setSelected] = useState<FileMeta | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
    void getLanpmApi()
      .file.getPreviewUrl(selected.fileId)
      .then(setPreviewUrl)
      .catch(() => setPreviewUrl(null))
  }, [selected])

  const activeTransfers = useMemo(
    () => transfers.filter((t) => t.status === 'queued' || t.status === 'transferring'),
    [transfers]
  )

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '类型', dataIndex: 'category', key: 'category', width: 80 },
    { title: '大小', key: 'size', width: 90, render: (_: unknown, r: FileMeta) => formatSize(r.size) },
    {
      title: '预览',
      key: 'preview',
      width: 90,
      render: (_: unknown, r: FileMeta) =>
        r.previewStatus === 'ready' ? '就绪' : r.previewStatus === 'converting' ? '转换中' : r.previewStatus === 'failed' ? '失败' : '—'
    }
  ]

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <Segmented
          options={CATEGORIES.map((c) => ({ label: c.label, value: c.value }))}
          value={category}
          onChange={(v) => setCategory(v as FileCategory | 'all')}
        />
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
      </div>

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
            <Spin className={styles.spinner} />
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
