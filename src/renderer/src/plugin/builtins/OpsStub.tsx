import { Typography } from 'antd'
import { useEffect, useState } from 'react'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import type { OpsMachineRecord } from '@shared/ops/types'
import { listOpsCommandSuggestions } from '@shared/chat/opsCommand'
import { useI18n } from '@renderer/i18n/useI18n'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import OpsProfilePanel from '@renderer/features/ops/OpsProfilePanel'

interface Props {
  plugin: PluginView
  groupId: string
  context?: ViewPluginContext
}

function OpsComposerHint({ groupId }: { groupId: string }): React.ReactElement {
  const { t } = useI18n()
  const [machines, setMachines] = useState<OpsMachineRecord[]>([])

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

  const online = machines.filter((m) => m.online).length
  const commandLine = listOpsCommandSuggestions().join(' · ')
  const machineLine =
    machines.length > 0
      ? t('plugin.opsComposerMachines', { online: String(online), total: String(machines.length) })
      : t('plugin.opsComposerNoMachines')

  return (
    <Typography.Text type="secondary" className="text-xs">
      {t('plugin.opsComposerHint')}
      <br />
      <span>{commandLine}</span>
      <br />
      {machineLine}
    </Typography.Text>
  )
}

/** `lanpm.ops` — 运维 Slot */
export default function OpsStub({ plugin, groupId, context }: Props): React.ReactElement | null {
  const { t } = useI18n()

  if (context?.view === 'profile') {
    return <OpsProfilePanel plugin={plugin} groupId={groupId || undefined} />
  }

  if (context?.zone === 'composer') {
    return groupId ? <OpsComposerHint groupId={groupId} /> : (
      <Typography.Text type="secondary" className="text-xs">
        {t('plugin.opsComposerHint')}
      </Typography.Text>
    )
  }
  if (context?.view === 'files') {
    return (
      <Typography.Text type="secondary" className="text-xs">
        {t('plugin.opsFilesHint', { name: plugin.name })}
      </Typography.Text>
    )
  }
  return null
}
