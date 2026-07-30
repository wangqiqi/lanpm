export const DISCOVER_IPC = {
  snapshot: 'discover:snapshot',
  setSeeds: 'discover:setSeeds'
} as const

export const PAIRING_IPC = {
  start: 'pairing:start',
  cancel: 'pairing:cancel',
  join: 'pairing:join',
  exportPeerFile: 'pairing:exportPeerFile',
  importPeerFile: 'pairing:importPeerFile',
  exportPeerFileDialog: 'pairing:exportPeerFileDialog',
  importPeerFileDialog: 'pairing:importPeerFileDialog'
} as const
