export const DISCOVER_IPC = {
  snapshot: 'discover:snapshot',
  setSeeds: 'discover:setSeeds'
} as const

export const PAIRING_IPC = {
  start: 'pairing:start',
  cancel: 'pairing:cancel',
  join: 'pairing:join'
} as const
