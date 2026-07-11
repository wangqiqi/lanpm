/**
 * Plugin IPC channels — Host only; plugins must not register ipcMain.
 */
export const PLUGIN_IPC = {
  listPlugins: 'plugin:listPlugins',
  listSlotPlugins: 'plugin:listSlotPlugins',
  setEnabled: 'plugin:setEnabled',
  invokeCapability: 'plugin:invokeCapability'
} as const
