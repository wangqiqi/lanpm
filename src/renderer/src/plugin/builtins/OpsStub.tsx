import { Typography } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import { useI18n } from '@renderer/i18n/useI18n'

interface Props {
  plugin: PluginView
  groupId: string
  context?: ViewPluginContext
}

/** `lanpm.ops` — 运维 Slot 占位（MVP） */
export default function OpsStub({ plugin, context }: Props): React.ReactElement | null {
  const { t } = useI18n()
  if (context?.zone === 'composer') {
    return (
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
