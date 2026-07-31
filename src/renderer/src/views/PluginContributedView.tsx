import { useMemo } from 'react'
import { Typography } from 'antd'
import { useParams } from 'react-router-dom'
import type { ContributedPluginView } from '@shared/plugin/contributions'
import { PluginZoneHost } from '@renderer/plugin/PluginSlot'
import PluginErrorBoundary from '@renderer/plugin/PluginErrorBoundary'
import { useContributedViews } from '@renderer/plugin/useContributedViews'
import { resolveContributedViewComponent } from '@renderer/plugin/viewRegistry'
import { usePluginView } from '@renderer/plugin/usePluginView'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './GroupView.module.css'

const { Text } = Typography

export default function PluginContributedView({ route }: { route: string }): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>()
  const { t } = useI18n()
  const contributedViews = useContributedViews()

  const contribution: ContributedPluginView | null = useMemo(
    () => contributedViews.find((v) => v.route === route) ?? null,
    [contributedViews, route]
  )

  const plugin = usePluginView(contribution?.pluginId ?? null)

  if (!groupId || !contribution) {
    return (
      <div className={styles.root}>
        <Text type="secondary">{t('plugin.unknownBuiltin', { id: route })}</Text>
      </div>
    )
  }

  const Comp = resolveContributedViewComponent(contribution.pluginId)
  const context = { groupId, view: route }

  return (
    <div className={`${styles.root} ${styles.taskView}`} data-contributed-view={route}>
      <div className={styles.taskBody}>
        <PluginZoneHost zone="toolbar" context={context} />
        {plugin && Comp ? (
          <PluginErrorBoundary pluginId={contribution.pluginId}>
            <Comp plugin={plugin} groupId={groupId} />
          </PluginErrorBoundary>
        ) : (
          <Text type="secondary">{t('plugin.unknownBuiltin', { id: contribution.pluginId })}</Text>
        )}
      </div>
    </div>
  )
}
