/**
 * Plugin IPC channels — Host only; plugins must not register ipcMain.
 */
export const PLUGIN_IPC = {
  listPlugins: 'plugin:listPlugins',
  listSlotPlugins: 'plugin:listSlotPlugins',
  listContributedViews: 'plugin:listContributedViews',
  listCommands: 'plugin:listCommands',
  invokeCommand: 'plugin:invokeCommand',
  setEnabled: 'plugin:setEnabled',
  invokeCapability: 'plugin:invokeCapability',
  importLicense: 'plugin:importLicense',
  getLicenseStatus: 'plugin:getLicenseStatus'
} as const
