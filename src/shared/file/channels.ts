export const FILE_TRANSFER_PUSH_CHANNEL = 'file:transfersChanged'

export const FILE_IPC = {
  list: 'file:list',
  upload: 'file:upload',
  getPreviewUrl: 'file:getPreviewUrl',
  getPreviewText: 'file:getPreviewText',
  listTransfers: 'file:listTransfers',
  listTransferHistory: 'file:listTransferHistory',
  resumeTransfer: 'file:resumeTransfer',
  getTransferSettings: 'file:getTransferSettings',
  setTransferRate: 'file:setTransferRate',
  addBookmark: 'file:addBookmark',
  importBookmarks: 'file:importBookmarks',
  exportBookmarks: 'file:exportBookmarks',
  pullRemote: 'file:pullRemote',
  download: 'file:download'
} as const

export const FILE_CHUNK_SIZE = 256 * 1024
export const FILE_MAX_CONCURRENT = 3
