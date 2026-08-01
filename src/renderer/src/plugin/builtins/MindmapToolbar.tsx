import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, Select, Space, Typography, message } from 'antd'
import {
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  ImportOutlined
} from '@ant-design/icons'
import type { PluginView } from '@shared/plugin/types'
import type { Task } from '@shared/task/types'
import { mindmapFileName } from '@shared/mindmap/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import ViewExportShareActions from '@renderer/components/view/ViewExportShareActions'
import { downloadText, sharePngToGroupChat } from '@renderer/lib/exportShare'
import { useMindmapDocumentStore } from '@renderer/stores/mindmapDocumentStore'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
}

export default function MindmapToolbar({ plugin, groupId }: Props): React.ReactElement {
  const { t, formatError } = useI18n()
  const documents = useMindmapDocumentStore((s) => s.documents)
  const docId = useMindmapDocumentStore((s) => s.docId)
  const title = useMindmapDocumentStore((s) => s.title)
  const dirty = useMindmapDocumentStore((s) => s.dirty)
  const saving = useMindmapDocumentStore((s) => s.saving)
  const refreshList = useMindmapDocumentStore((s) => s.refreshList)
  const openDocument = useMindmapDocumentStore((s) => s.openDocument)
  const createDocument = useMindmapDocumentStore((s) => s.createDocument)
  const saveCurrent = useMindmapDocumentStore((s) => s.saveCurrent)
  const renameCurrent = useMindmapDocumentStore((s) => s.renameCurrent)
  const deleteCurrent = useMindmapDocumentStore((s) => s.deleteCurrent)
  const serialize = useMindmapDocumentStore((s) => s.serialize)
  const exportPng = useMindmapDocumentStore((s) => s.exportPng)

  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    void refreshList(groupId)
  }, [groupId, refreshList])

  const handleNew = useCallback(async () => {
    try {
      await createDocument(groupId)
      message.success(t('plugin.mindmapCreated'))
      window.dispatchEvent(new CustomEvent('lanpm:mindmap-reload'))
    } catch (err) {
      message.error(formatError(err, 'plugin.mindmapCreateFailed'))
    }
  }, [groupId, createDocument, t, formatError])

  const handleOpen = useCallback(
    async (nextId: string) => {
      try {
        await openDocument(nextId)
        window.dispatchEvent(new CustomEvent('lanpm:mindmap-reload'))
      } catch (err) {
        message.error(formatError(err, 'plugin.mindmapLoadFailed'))
      }
    },
    [openDocument, formatError]
  )

  const handleSave = useCallback(async () => {
    const ok = await saveCurrent()
    if (ok) message.success(t('plugin.mindmapSaved'))
    else message.error(t('plugin.mindmapSaveFailed'))
  }, [saveCurrent, t])

  const handleImportTasks = useCallback(async () => {
    try {
      const raw = await getLanpmApi().plugin.invokeCapability(plugin.id, 'task.list', {
        groupId
      })
      const tasks = (raw as Task[]) ?? []
      window.dispatchEvent(
        new CustomEvent('lanpm:mindmap-import-tasks', { detail: { tasks } })
      )
      useMindmapDocumentStore.getState().setDirty(true)
      message.success(t('plugin.mindmapImportedTasks'))
    } catch (err) {
      message.error(formatError(err, 'plugin.mindmapImportFailed'))
    }
  }, [plugin.id, groupId, t, formatError])

  const handleDelete = useCallback(() => {
    Modal.confirm({
      title: t('plugin.mindmapDeleteConfirm'),
      onOk: async () => {
        try {
          await deleteCurrent()
          message.success(t('plugin.mindmapDeleted'))
          window.dispatchEvent(new CustomEvent('lanpm:mindmap-reload'))
        } catch (err) {
          message.error(formatError(err, 'plugin.mindmapDeleteFailed'))
        }
      }
    })
  }, [deleteCurrent, t, formatError])

  const handleDownloadJson = useCallback(async () => {
    if (!serialize) return
    setDownloading(true)
    try {
      const dataJson = serialize()
      downloadText(dataJson, mindmapFileName(title || 'mindmap'))
      message.success(t('plugin.mindmapDownloadJsonDone'))
    } catch (err) {
      message.error(formatError(err, 'plugin.mindmapExportFailed'))
    } finally {
      setDownloading(false)
    }
  }, [serialize, title, t, formatError])

  const handleShare = useCallback(async () => {
    if (!docId || !exportPng) return
    setSharing(true)
    try {
      const blob = await exportPng()
      if (!blob) throw new Error('export png failed')
      const stamp = new Date().toISOString().slice(0, 10)
      await sharePngToGroupChat(groupId, blob, `mindmap-${stamp}.png`)
      message.success(t('files.sharedToChat'))
    } catch (err) {
      message.error(formatError(err, 'chat.fileSendFailed'))
    } finally {
      setSharing(false)
    }
  }, [docId, exportPng, groupId, t, formatError])

  const handleRename = useCallback(() => {
    let nextTitle = title
    Modal.confirm({
      title: t('plugin.mindmapRename'),
      content: (
        <input
          defaultValue={title}
          onChange={(e) => {
            nextTitle = e.target.value
          }}
          className={styles.mindmapRenameInput}
        />
      ),
      onOk: async () => {
        if (!nextTitle.trim()) return
        try {
          await renameCurrent(nextTitle.trim())
          message.success(t('plugin.mindmapRenamed'))
        } catch (err) {
          message.error(formatError(err, 'plugin.mindmapRenameFailed'))
        }
      }
    })
  }, [title, renameCurrent, t, formatError])

  return (
    <div className={styles.mindmapToolbar} data-testid="mindmap-toolbar">
      <Space wrap size="small">
        <Select
          size="small"
          style={{ minWidth: 180 }}
          placeholder={t('plugin.mindmapSelectDoc')}
          value={docId ?? undefined}
          onChange={(id) => void handleOpen(id)}
          options={documents.map((d) => ({ value: d.docId, label: d.title }))}
          aria-label={t('plugin.mindmapSelectDoc')}
        />
        <Button size="small" icon={<PlusOutlined />} onClick={() => void handleNew()}>
          {t('plugin.mindmapNew')}
        </Button>
        <Button
          size="small"
          icon={<SaveOutlined />}
          loading={saving}
          disabled={!docId || !dirty}
          onClick={() => void handleSave()}
        >
          {t('plugin.mindmapSave')}
        </Button>
        <Button size="small" onClick={handleRename} disabled={!docId}>
          {t('plugin.mindmapRename')}
        </Button>
        <Button
          size="small"
          icon={<ImportOutlined />}
          onClick={() => void handleImportTasks()}
          disabled={!docId}
        >
          {t('plugin.mindmapImportTasks')}
        </Button>
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={handleDelete}
          disabled={!docId}
        />
        <ViewExportShareActions
          onDownload={() => void handleDownloadJson()}
          onShareToChat={() => void handleShare()}
          downloading={downloading}
          sharing={sharing}
          downloadDisabled={!docId || !serialize}
          shareDisabled={!docId || !exportPng}
          downloadLabel={t('plugin.mindmapDownloadJson')}
        />
        {dirty ? <Text type="secondary">{t('plugin.mindmapUnsaved')}</Text> : null}
      </Space>
    </div>
  )
}
