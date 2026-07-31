import { ipcMain } from 'electron'
import { PLUGIN_IPC } from '../../shared/plugin/channels'
import type { PluginCapabilityId, PluginSlotId } from '../../shared/plugin/types'
import { PLUGIN_CAPABILITY_IDS, PLUGIN_SLOT_IDS } from '../../shared/plugin/types'
import {
  discoverPlugins,
  listContributedViews,
  listCommands,
  listMenus,
  listSlotPlugins
} from '../plugin/discover'
import { setPluginEnabled } from '../plugin/enabledStore'
import { confirmPluginCapability, invokePluginCapability } from '../plugin/capabilityProxy'
import { getPluginLicenseStatus, importPluginLicense } from '../plugin/licenseStore'
import { invokeListedCommand } from '../plugin/commandRegistry'

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

  ipcMain.handle(PLUGIN_IPC.listCommands, () => listCommands())

  ipcMain.handle(PLUGIN_IPC.listMenus, () => listMenus())

  ipcMain.handle(PLUGIN_IPC.invokeCommand, (_event, commandId: string) => {
    if (typeof commandId !== 'string' || !commandId.trim()) {
      throw new Error('commandId required')
    }
    const known = listCommands().some((c) => c.commandId === commandId)
    if (!known) {
      return { ok: false, commandId, message: 'unknown command' }
    }
    return invokeListedCommand(commandId, discoverPlugins())
  })

  ipcMain.handle(PLUGIN_IPC.importLicense, (_event, payload: string) => {
    if (typeof payload !== 'string' || !payload.trim()) {
      throw new Error('license payload required')
    }
    let raw: unknown
    try {
      raw = JSON.parse(payload)
    } catch {
      throw new Error('invalid license JSON')
    }
    return importPluginLicense(raw)
  })

  ipcMain.handle(PLUGIN_IPC.getLicenseStatus, (_event, pluginId: string) => {
    if (typeof pluginId !== 'string' || !pluginId) throw new Error('pluginId required')
    return getPluginLicenseStatus(pluginId)
  })

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

  ipcMain.handle(
    PLUGIN_IPC.confirmCapability,
    (_event, pluginId: string, pendingId: string) => {
      if (typeof pluginId !== 'string' || !pluginId) throw new Error('pluginId required')
      if (typeof pendingId !== 'string' || !pendingId) throw new Error('pendingId required')
      return confirmPluginCapability(pluginId, pendingId)
    }
  )
}
