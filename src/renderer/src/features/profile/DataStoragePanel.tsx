import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Typography
} from 'antd'
import type { BundleConflictMode, GroupBundlePreviewResult } from '@shared/data/bundle'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useDataStore } from '@renderer/stores/dataStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useChatStore } from '@renderer/stores/chatStore'
import {
  LOCAL_RETENTION_DAYS_MAX,
  LOCAL_RETENTION_DAYS_MIN
} from '@shared/data/retention'
import { useI18n } from '@renderer/i18n/useI18n'
import { usePluginView } from '@renderer/plugin/usePluginView'
import { defaultPluginEnabled } from '@shared/plugin/enabledDefaults'
import { runOnEnter } from '@renderer/lib/inputKeyboard'
import type { DataCleanupOptions } from '@shared/data/types'
import styles from './DataStoragePanel.module.css'

const { Text } = Typography

export default function DataStoragePanel(): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const settings = useDataStore((s) => s.settings)
  const usage = useDataStore((s) => s.usage)
  const loading = useDataStore((s) => s.loading)
  const loadSettings = useDataStore((s) => s.loadSettings)
  const setRetentionDays = useDataStore((s) => s.setRetentionDays)
  const runCleanup = useDataStore((s) => s.runCleanup)
  const clearGroupMessages = useDataStore((s) => s.clearGroupMessages)
  const groups = useNavigationStore((s) => s.groups)
  const evictGroup = useChatStore((s) => s.evictGroup)
  const backupPlugin = usePluginView('lanpm.backup')
  const showBackup = backupPlugin ? backupPlugin.enabled : defaultPluginEnabled('lanpm.backup')

  const [retention, setRetention] = useState(90)
  const [cleanOpen, setCleanOpen] = useState(false)
  const [cleanOpts, setCleanOpts] = useState<DataCleanupOptions>({
    chat: true,
    files: false,
    transfers: true,
    taskTrash: true
  })
  const [clearGroupId, setClearGroupId] = useState<string | undefined>()
  const [clearMode, setClearMode] = useState<'older_than_retention' | 'all_local'>(
    'older_than_retention'
  )
  const [bundleGroupId, setBundleGroupId] = useState<string | undefined>()
  const [bundlePassword, setBundlePassword] = useState('')
  const [bundleIncludeFiles, setBundleIncludeFiles] = useState(false)
  const [importPassword, setImportPassword] = useState('')
  const [importMode, setImportMode] = useState<BundleConflictMode>('skip')
  const [importBusy, setImportBusy] = useState(false)
  const [atRestEncrypted, setAtRestEncrypted] = useState(false)
  const [atRestPass, setAtRestPass] = useState('')
  const [atRestPass2, setAtRestPass2] = useState('')
  const [atRestBusy, setAtRestBusy] = useState(false)

  const modeLabel = (mode: BundleConflictMode): string => {
    if (mode === 'skip') return t('data.bundleConflictSkip')
    if (mode === 'new_id') return t('data.bundleConflictNewId')
    return t('data.bundleConflictOverwrite')
  }

  const previewBody = (preview: GroupBundlePreviewResult, mode: BundleConflictMode): string => {
    const crdt =
      preview.totals.taskCrdt + preview.totals.whiteboardCrdt + preview.totals.whiteboardScene
    const cCrdt =
      preview.conflicts.taskCrdt +
      preview.conflicts.whiteboardCrdt +
      preview.conflicts.whiteboardScene
    return t('data.bundlePreviewBody', {
      groupId: preview.groupId,
      exportedAt: preview.exportedAt,
      messages: preview.totals.messages,
      tasks: preview.totals.tasks,
      files: preview.totals.files,
      tags: preview.totals.tags,
      members: preview.totals.members,
      checklists: preview.totals.checklists,
      crdt,
      cMessages: preview.conflicts.messages,
      cTasks: preview.conflicts.tasks,
      cFiles: preview.conflicts.files,
      cTags: preview.conflicts.tags,
      cMembers: preview.conflicts.members,
      cChecklists: preview.conflicts.checklists,
      cCrdt,
      mode: modeLabel(mode)
    })
  }

  const runImportWithPath = async (path: string, mode: BundleConflictMode): Promise<void> => {
    setImportBusy(true)
    try {
      const result = await getLanpmApi().data.importGroupBundle(importPassword, mode, path)
      if (!result) return
      message.success(
        t('data.bundleImportDone', {
          messages: result.messagesImported,
          tasks: result.tasksImported,
          files: result.filesImported,
          tags: result.tagsImported,
          members: result.membersImported,
          checklists: result.checklistsImported,
          skipped: result.skipped,
          overwritten: result.overwritten
        })
      )
    } finally {
      setImportBusy(false)
    }
  }

  const startBundleImport = async (): Promise<void> => {
    if (importPassword.length < 4 || importBusy) return
    setImportBusy(true)
    try {
      const picked = await getLanpmApi().data.previewGroupBundle(importPassword)
      if (!picked) return
      const { path, preview } = picked
      const hasConflicts =
        preview.conflicts.messages +
          preview.conflicts.tasks +
          preview.conflicts.files +
          preview.conflicts.tags +
          preview.conflicts.members +
          preview.conflicts.checklists +
          preview.conflicts.taskCrdt +
          preview.conflicts.whiteboardCrdt +
          preview.conflicts.whiteboardScene >
        0

      const confirmImport = (): void => {
        const proceed = async (): Promise<void> => {
          try {
            await runImportWithPath(path, importMode)
          } catch (err) {
            message.error(formatError(err, 'data.saveFailed'))
          }
        }
        if (importMode === 'overwrite') {
          Modal.confirm({
            title: t('data.bundleOverwriteConfirmTitle'),
            content: t('data.bundleOverwriteConfirmBody'),
            okText: t('data.bundleImportConfirm'),
            okButtonProps: { danger: true },
            cancelText: t('common.cancel'),
            onOk: () => void proceed()
          })
          return
        }
        void proceed()
      }

      Modal.confirm({
        title: t('data.bundlePreviewTitle'),
        content: (
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
            {previewBody(preview, importMode)}
            {hasConflicts && importMode === 'overwrite' ? (
              <>
                {'\n\n'}
                <Typography.Text type="danger">{t('data.bundleOverwriteConfirmBody')}</Typography.Text>
              </>
            ) : null}
          </Typography.Paragraph>
        ),
        okText: t('data.bundleImportConfirm'),
        okButtonProps: importMode === 'overwrite' ? { danger: true } : undefined,
        cancelText: t('common.cancel'),
        onOk: () => {
          confirmImport()
        }
      })
    } catch (err) {
      message.error(formatError(err, 'data.saveFailed'))
    } finally {
      setImportBusy(false)
    }
  }

  useEffect(() => {
    void loadSettings()
    void getLanpmApi()
      .data.getAtRestStatus()
      .then((s) => setAtRestEncrypted(s.encrypted))
      .catch(() => setAtRestEncrypted(false))
  }, [loadSettings])

  useEffect(() => {
    if (settings) setRetention(settings.localRetentionDays)
  }, [settings])

  const saveRetention = async (): Promise<void> => {
    try {
      await setRetentionDays(retention)
      message.success(t('data.retentionSaved'))
    } catch (err) {
      message.error(formatError(err, 'data.saveFailed'))
    }
  }

  const confirmCleanup = (): void => {
    Modal.confirm({
      title: t('data.cleanupConfirmTitle'),
      content: t('data.cleanupConfirmBody'),
      okText: t('data.cleanupRun'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          const result = await runCleanup(cleanOpts)
          message.success(
            t('data.cleanupDone', {
              messages: result.messagesDeleted,
              tasks: result.tasksDeleted,
              transfers: result.transfersDeleted
            })
          )
          setCleanOpen(false)
        } catch (err) {
          message.error(formatError(err, 'data.saveFailed'))
        }
      }
    })
  }

  const onClearGroup = (): void => {
    if (!clearGroupId) return
    Modal.confirm({
      title: t('data.clearGroupConfirmTitle'),
      content:
        clearMode === 'all_local'
          ? t('data.clearGroupAllBody')
          : t('data.clearGroupRetentionBody'),
      okText: t('data.clearGroupRun'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const n = await clearGroupMessages(clearGroupId, clearMode)
          evictGroup(clearGroupId)
          message.success(t('data.clearGroupDone', { count: n }))
        } catch (err) {
          message.error(formatError(err, 'data.saveFailed'))
        }
      }
    })
  }

  return (
    <div className={styles.panel} data-testid="data-storage-panel">
      <section className={styles.card}>
        <Text strong className={styles.cardTitle}>
          {t('data.sectionRetention')}
        </Text>
        <Text type="secondary" className={styles.hint}>
          {t('data.intro')}
        </Text>
        <Form layout="vertical" requiredMark={false} className={styles.retentionRow}>
          <Form.Item label={t('data.retentionLabel')} className={styles.retentionField}>
            <Space wrap>
              <InputNumber
                min={LOCAL_RETENTION_DAYS_MIN}
                max={LOCAL_RETENTION_DAYS_MAX}
                value={retention}
                onChange={(v) => setRetention(v ?? 90)}
                onPressEnter={runOnEnter(() => void saveRetention())}
              />
              <Button type="primary" loading={loading} onClick={() => void saveRetention()}>
                {t('common.save')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
        <div className={styles.usageRow}>
          <Text type="secondary">{t('data.usageLabel')}</Text>
          <br />
          <Text>
            {t('data.usageStats', {
              messages: usage?.messageCount ?? 0,
              files: usage?.fileCount ?? 0
            })}
          </Text>
        </div>
        <Text type="secondary" className={styles.footnote}>
          {t('data.syncWindowDesc', { days: settings?.syncWindowDays ?? 7 })}
        </Text>
      </section>

      <section className={styles.card}>
        <Text strong className={styles.cardTitle}>
          {t('data.sectionMaintenance')}
        </Text>
        <Text type="secondary" className={styles.hint}>
          {t('data.cleanupHint')}
        </Text>
        <Button onClick={() => setCleanOpen(true)}>{t('data.cleanupOpen')}</Button>

        <div className={styles.subsection}>
          <Text strong className={styles.subsectionTitle}>
            {t('data.clearGroupTitle')}
          </Text>
          <Text type="secondary" className={styles.hint}>
            {t('data.clearGroupHint')}
          </Text>
          <div className={styles.controlRow}>
            <Select
              className={styles.fullWidth}
              placeholder={t('data.clearGroupPick')}
              value={clearGroupId}
              onChange={setClearGroupId}
              options={groups.map((g) => ({ value: g.groupId, label: g.name }))}
            />
            <Select
              value={clearMode}
              onChange={setClearMode}
              options={[
                { value: 'older_than_retention', label: t('data.clearGroupOlder') },
                { value: 'all_local', label: t('data.clearGroupAll') }
              ]}
            />
            <Button danger disabled={!clearGroupId} onClick={onClearGroup}>
              {t('data.clearGroupRun')}
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.card} data-testid="data-at-rest-panel">
        <Text strong className={styles.cardTitle}>
          {t('data.sectionAtRest')}
        </Text>
        <Text type="secondary" className={styles.hint}>
          {t('data.atRestHint')}
        </Text>
        <Text>{atRestEncrypted ? t('data.atRestEncrypted') : t('data.atRestPlain')}</Text>
        {!atRestEncrypted ? (
          <div className={styles.fieldStack}>
            <Input.Password
              className={styles.fullWidth}
              placeholder={t('data.atRestPassphrase')}
              value={atRestPass}
              onChange={(e) => setAtRestPass(e.target.value)}
              autoComplete="new-password"
            />
            <Input.Password
              className={styles.fullWidth}
              placeholder={t('data.atRestConfirm')}
              value={atRestPass2}
              onChange={(e) => setAtRestPass2(e.target.value)}
              autoComplete="new-password"
            />
            <Button
              disabled={atRestPass.length < 8 || atRestBusy}
              loading={atRestBusy}
              onClick={() => {
                if (atRestPass !== atRestPass2) {
                  message.error(t('data.atRestMismatch'))
                  return
                }
                Modal.confirm({
                  title: t('data.atRestEncrypt'),
                  content: t('data.atRestForgetWarning'),
                  okText: t('data.atRestEncrypt'),
                  cancelText: t('common.cancel'),
                  okButtonProps: { danger: true },
                  onOk: async () => {
                    setAtRestBusy(true)
                    try {
                      await getLanpmApi().data.encryptAtRest(atRestPass)
                      setAtRestEncrypted(true)
                      setAtRestPass('')
                      setAtRestPass2('')
                      message.success(t('data.atRestDone'))
                    } catch (err) {
                      message.error(formatError(err, 'data.saveFailed'))
                    } finally {
                      setAtRestBusy(false)
                    }
                  }
                })
              }}
            >
              {t('data.atRestEncrypt')}
            </Button>
          </div>
        ) : null}
      </section>

      {showBackup ? (
      <section className={styles.card} data-testid="data-backup-section" data-plugin-slot="profile.data.backup">
        <Text strong className={styles.cardTitle}>
          {t('data.sectionBackup')}
        </Text>
        <Text type="secondary" className={styles.hint}>
          {t('data.bundleHint')}
        </Text>

        <div className={styles.subsection}>
          <Text strong className={styles.subsectionTitle}>
            {t('data.bundleExportSection')}
          </Text>
          <div className={styles.fieldStack}>
            <Select
              className={styles.fullWidth}
              placeholder={t('data.clearGroupPick')}
              value={bundleGroupId}
              onChange={setBundleGroupId}
              options={groups.map((g) => ({ value: g.groupId, label: g.name }))}
            />
            <Input.Password
              className={styles.fullWidth}
              placeholder={t('data.bundlePassword')}
              value={bundlePassword}
              onChange={(e) => setBundlePassword(e.target.value)}
            />
            <Checkbox
              checked={bundleIncludeFiles}
              onChange={(e) => setBundleIncludeFiles(e.target.checked)}
            >
              {t('data.bundleIncludeFiles')}
            </Checkbox>
            <Button
              disabled={!bundleGroupId || bundlePassword.length < 4}
              onClick={() => {
                if (!bundleGroupId) return
                void getLanpmApi()
                  .data.exportGroupBundle(bundleGroupId, bundlePassword, bundleIncludeFiles)
                  .then((result) => {
                    if (!result) return
                    message.success(t('data.bundleExportDone', { path: result.path }))
                    if (result.messagesTruncated) {
                      message.warning(
                        t('data.bundleExportTruncated', {
                          exported: result.messagesExported,
                          total: result.messagesTotalInGroup,
                          limit: result.messageExportLimit
                        })
                      )
                    }
                  })
                  .catch((err) => message.error(formatError(err, 'data.saveFailed')))
              }}
            >
              {t('data.bundleExport')}
            </Button>
          </div>
        </div>

        <div className={styles.subsection}>
          <Text strong className={styles.subsectionTitle}>
            {t('data.bundleImportSection')}
          </Text>
          <div className={styles.fieldStack}>
            <Input.Password
              className={styles.fullWidth}
              placeholder={t('data.bundleImportPassword')}
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
            />
            <Select
              className={styles.fullWidth}
              value={importMode}
              onChange={setImportMode}
              options={[
                { value: 'skip', label: t('data.bundleConflictSkip') },
                { value: 'new_id', label: t('data.bundleConflictNewId') },
                { value: 'overwrite', label: t('data.bundleConflictOverwrite') }
              ]}
            />
            <Button
              disabled={importPassword.length < 4 || importBusy}
              loading={importBusy}
              onClick={() => void startBundleImport()}
            >
              {t('data.bundleImport')}
            </Button>
          </div>
        </div>
      </section>
      ) : null}

      <Modal
        title={t('data.cleanupOpen')}
        open={cleanOpen}
        onCancel={() => setCleanOpen(false)}
        onOk={confirmCleanup}
        okText={t('data.cleanupRun')}
        cancelText={t('common.cancel')}
      >
        <Typography.Paragraph type="secondary" className={styles.hint}>
          {t('data.cleanupHint')}
        </Typography.Paragraph>
        <Checkbox
          checked={cleanOpts.chat}
          onChange={(e) => setCleanOpts((o) => ({ ...o, chat: e.target.checked }))}
        >
          {t('data.cleanupChat')}
        </Checkbox>
        <br />
        <Checkbox
          checked={cleanOpts.files}
          onChange={(e) => setCleanOpts((o) => ({ ...o, files: e.target.checked }))}
        >
          {t('data.cleanupFiles')}
        </Checkbox>
        <br />
        <Checkbox
          checked={cleanOpts.transfers}
          onChange={(e) => setCleanOpts((o) => ({ ...o, transfers: e.target.checked }))}
        >
          {t('data.cleanupTransfers')}
        </Checkbox>
        <br />
        <Checkbox
          checked={cleanOpts.taskTrash}
          onChange={(e) => setCleanOpts((o) => ({ ...o, taskTrash: e.target.checked }))}
        >
          {t('data.cleanupTaskTrash')}
        </Checkbox>
      </Modal>
    </div>
  )
}
