import { ipcMain } from 'electron'
import { PLUGIN_IPC } from '../../shared/plugin/channels'
import type { PluginCapabilityId, PluginSlotId } from '../../shared/plugin/types'
import { PLUGIN_CAPABILITY_IDS, PLUGIN_SLOT_IDS } from '../../shared/plugin/types'
import { discoverPlugins, listContributedViews, listSlotPlugins } from '../plugin/discover'
import { setPluginEnabled } from '../plugin/enabledStore'
import { invokePluginCapability } from '../plugin/capabilityProxy'

const SLOT_SET = new Set<string>(PLUGIN_SLOT_IDS)
const CAP_SET = new Set<string>(PLUGIN_CAPABILITY_IDS)

export function registerPluginIpc(): void {
  ipcMain.handle(PLUGIN_IPC.listPlugins, () => discoverPlugins())

  ipcMain.handle(PLUGIN_IPC.listSlotPlugins, (_event, slotId: string) => {
    if (typeof slotId !== 'string' || !SLOT_SET.has(slotId)) {
      throw new Error('invalid slotId')
    }
    return listSlotPlugins(slotId as PluginSlotId)
  })

  ipcMain.handle(PLUGIN_IPC.listContributedViews, () => listContributedViews())

  ipcMain.handle(PLUGIN_IPC.setEnabled, (_event, pluginId: string, enabled: boolean) => {
    if (typeof pluginId !== 'string' || !pluginId) throw new Error('pluginId required')
    if (typeof enabled !== 'boolean') throw new Error('enabled must be boolean')
    setPluginEnabled(pluginId, enabled)
    return discoverPlugins()
  })

  ipcMain.handle(
    PLUGIN_IPC.invokeCapability,
    (
      _event,
      pluginId: string,
      capability: string,
      args?: Record<string, unknown>
    ) => {
      if (typeof pluginId !== 'string' || !pluginId) throw new Error('pluginId required')
      if (typeof capability !== 'string' || !CAP_SET.has(capability)) {
        throw new Error('invalid capability')
      }
      return invokePluginCapability(
        pluginId,
        capability as PluginCapabilityId,
        args && typeof args === 'object' ? args : {}
      )
    }
  )
}
