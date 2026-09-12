import { useEffect, useState } from 'react'
import { Typography } from 'antd'
import type { AppView } from '@shared/navigation/types'
import type { PluginSlotId, PluginView } from '@shared/plugin/types'
import type {
  PluginGlobalSlotProps,
  PluginProfileTabProps,
  PluginSlotHostProps,
  PluginZoneHostProps,
  ViewPluginContext
} from '@shared/plugin/viewHost'
import { useI18n } from '@renderer/i18n/useI18n'
import PluginErrorBoundary from './PluginErrorBoundary'
import { resolvePluginComponent } from './registry'
import { PLUGIN_ENABLED_CHANGED_EVENT } from './pluginEvents'
import { fetchSlotPluginsCached } from './pluginSlotCache'
import { getViewZoneSlots } from './viewSlotMap'
import styles from './plugin.module.css'

const { Text } = Typography

export type PluginSlotHostOptions = PluginSlotHostProps & {
  /** 任务详情区展示「扩展（插件）」标题 */
  showSectionLabel?: boolean
}

function useSlotPlugins(slot: PluginSlotId): PluginView[] {
  const [plugins, setPlugins] = useState<PluginView[]>([])
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const onChanged = (): void => setReloadToken((n) => n + 1)
    window.addEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onChanged)
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchSlotPluginsCached(slot).then((list) => {
      if (!cancelled) setPlugins(list)
    })
    return () => {
      cancelled = true
    }
  }, [slot, reloadToken])

  return plugins
}

export { useSlotPlugins }

function PluginInstanceList({
  plugins,
  context
}: {
  plugins: PluginView[]
  context: ViewPluginContext
}): React.ReactElement | null {
  const { t } = useI18n()
  const taskId = context.selection?.taskId

  if (plugins.length === 0) return null

  return (
    <>
      {plugins.map((plugin) => {
        const Comp = resolvePluginComponent(plugin.id)
        if (!Comp) {
          return (
            <div key={plugin.id} className={styles.card}>
              <Text type="secondary">{t('plugin.unknownBuiltin', { id: plugin.id })}</Text>
            </div>
          )
        }
        return (
          <PluginErrorBoundary key={plugin.id} pluginId={plugin.id}>
            <Comp plugin={plugin} groupId={context.groupId} taskId={taskId} context={context} />
          </PluginErrorBoundary>
        )
      })}
    </>
  )
}

/** 单槽宿主：按 context 渲染已启用插件 */
export function PluginSlotHost({
  slot,
  context,
  showSectionLabel = false,
  inline = false
}: PluginSlotHostOptions & { inline?: boolean }): React.ReactElement | null {
  const { t } = useI18n()
  const plugins = useSlotPlugins(slot)

  if (plugins.length === 0) return null

  if (inline) {
    return <PluginInstanceList plugins={plugins} context={context} />
  }

  return (
    <div className={styles.slot} data-plugin-slot={slot}>
      {showSectionLabel ? <Text type="secondary">{t('plugin.slotSection')}</Text> : null}
      <PluginInstanceList plugins={plugins} context={context} />
    </div>
  )
}

/** 全局 Slot 锚点：无插件时仍保留 data-plugin-slot */
export function PluginGlobalSlot({
  slot,
  context,
  className,
  inline = false
}: PluginGlobalSlotProps & { className?: string; inline?: boolean }): React.ReactElement {
  const plugins = useSlotPlugins(slot)
  return (
    <div
      className={`${styles.globalSlot} ${inline ? styles.globalSlotInline : ''} ${className ?? ''}`}
      data-plugin-slot={slot}
    >
      <PluginInstanceList plugins={plugins} context={context} />
    </div>
  )
}

/** Profile 插件 Tab 内容 */
export function PluginProfileTabBody({
  plugin,
  context
}: PluginProfileTabProps): React.ReactElement | null {
  const { t } = useI18n()
  const Comp = resolvePluginComponent(plugin.id)
  const viewContext: ViewPluginContext = {
    groupId: context.groupId ?? '',
    view: context.view ?? 'profile'
  }
  if (!Comp) {
    return (
      <div className={styles.card}>
        <Text type="secondary">{t('plugin.unknownBuiltin', { id: plugin.id })}</Text>
      </div>
    )
  }
  return (
    <PluginErrorBoundary pluginId={plugin.id}>
      <Comp plugin={plugin} groupId={viewContext.groupId} context={viewContext} />
    </PluginErrorBoundary>
  )
}

export function useProfileTabPlugins(): PluginView[] {
  return useSlotPlugins('profile.tab')
}

/** 视图 zone 容器：无插件时仍保留空锚点 */
export function PluginZoneHost({ zone, context }: PluginZoneHostProps): React.ReactElement {
  const slots = getViewZoneSlots(context.view, zone)
  const zoneContext: ViewPluginContext = { ...context, zone }
  return (
    <div
      className={`${styles.zoneHost}${zone === 'composerHint' ? ` ${styles.zoneHostComposerHint}` : ''}`}
      data-plugin-zone={zone}
      data-plugin-view={context.view}
    >
      {slots.map((slot) => (
        <PluginSlotHost key={slot} slot={slot} context={zoneContext} inline />
      ))}
    </div>
  )
}

/** 群级 Slot：不传 taskId */
export function PluginGroupSlot({
  slot,
  groupId,
  view
}: {
  slot: PluginSlotId
  groupId: string
  view: AppView
}): React.ReactElement | null {
  return <PluginSlotHost slot={slot} context={{ groupId, view }} />
}

/** 任务级 Slot：薄封装 */
export function PluginTaskSlot({
  slot,
  groupId,
  taskId,
  view,
  showSectionLabel = false
}: {
  slot: PluginSlotId
  groupId: string
  taskId: string
  view: AppView
  showSectionLabel?: boolean
}): React.ReactElement | null {
  return (
    <PluginSlotHost
      slot={slot}
      context={{ groupId, view, selection: { taskId } }}
      showSectionLabel={showSectionLabel}
    />
  )
}

interface LegacyPluginSlotProps {
  slotId: PluginSlotId
  groupId: string
  taskId: string
}

/** @deprecated 优先用 PluginTaskSlot / PluginZoneHost */
export default function PluginSlot({
  slotId,
  groupId,
  taskId
}: LegacyPluginSlotProps): React.ReactElement | null {
  return (
    <PluginTaskSlot
      slot={slotId}
      groupId={groupId}
      taskId={taskId}
      view="tree"
      showSectionLabel
    />
  )
}
