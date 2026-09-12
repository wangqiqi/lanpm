import { Button, Typography } from 'antd'
import { useEffect, useState } from 'react'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import type { OpsMachineRecord } from '@shared/ops/types'
import { isOpsCommandDraft } from '@shared/chat/opsCommand'
import { useI18n } from '@renderer/i18n/useI18n'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import OpsProfilePanel from '@renderer/features/ops/OpsProfilePanel'
import styles from '@renderer/plugin/plugin.module.css'

interface Props {
  plugin: PluginView
  groupId: string
  context?: ViewPluginContext
}

function OpsComposerHint({
  groupId,
  composerDraft
}: {
  groupId: string
  composerDraft?: string
}): React.ReactElement {
  const { t } = useI18n()
  const [machines, setMachines] = useState<OpsMachineRecord[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!groupId) return
    let cancelled = false
    void getLanpmApi()
      .ops.listMachines(groupId)
      .then((list) => {
        if (!cancelled) setMachines(list)
      })
      .catch(() => {
        if (!cancelled) setMachines([])
      })
    return () => {
      cancelled = true
    }
  }, [groupId])

  const draftOps = isOpsCommandDraft(composerDraft ?? '')
  const showExpanded = expanded || draftOps

  const online = machines.filter((m) => m.online).length
  const machineLine =
    machines.length > 0
      ? t('plugin.opsComposerMachines', { online: String(online), total: String(machines.length) })
      : t('plugin.opsComposerNoMachines')

  const commandLine = t('plugin.opsComposerHint')

  return (
    <div className={styles.composerHintBlock} data-testid="ops-composer-hint">
      <div className={styles.composerHintSummary}>
        <Typography.Text type="secondary" className={styles.composerHintText}>
          {t('plugin.opsComposerSummary', { machines: machineLine })}
        </Typography.Text>
        <Button
          type="link"
          size="small"
          className={styles.composerHintToggle}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={showExpanded}
        >
          {showExpanded ? t('plugin.opsComposerCollapse') : t('plugin.opsComposerExpand')}
        </Button>
      </div>
      {showExpanded ? (
        <Typography.Text type="secondary" className={styles.composerHintDetail}>
          {commandLine}
        </Typography.Text>
      ) : null}
    </div>
  )
}

/** `lanpm.ops` — 运维 Slot */
export default function OpsStub({ plugin, groupId, context }: Props): React.ReactElement | null {
  const { t } = useI18n()

  if (context?.view === 'profile') {
    return <OpsProfilePanel plugin={plugin} groupId={groupId || undefined} />
  }

  if (context?.zone === 'composer') {
    return null
  }

  if (context?.zone === 'composerHint') {
    return groupId ? (
      <OpsComposerHint groupId={groupId} composerDraft={context.composerDraft} />
    ) : (
      <Typography.Text type="secondary" className={styles.composerHintText}>
        {t('plugin.opsComposerSummary', { machines: t('plugin.opsComposerNoMachines') })}
      </Typography.Text>
    )
  }

  if (context?.view === 'files') {
    return (
      <Typography.Text type="secondary" className="text-xs">
        {t('plugin.opsFilesHint', {
          name: plugin.id === 'lanpm.ops' ? t('plugin.name.ops') : plugin.name
        })}
      </Typography.Text>
    )
  }
  return null
}
