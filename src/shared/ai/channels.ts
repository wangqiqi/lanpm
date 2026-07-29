export const AI_IPC = {
  listThreads: 'ai:listThreads',
  getThread: 'ai:getThread',
  createThread: 'ai:createThread',
  appendMessage: 'ai:appendMessage',
  deleteThread: 'ai:deleteThread',
  getGateStatus: 'ai:getGateStatus',
  streamChat: 'ai:streamChat',
  reviewTask: 'ai:reviewTask',
  shareToChat: 'ai:shareToChat'
} as const

export const AI_STREAM_CHUNK_CHANNEL = 'ai:streamChunk' as const
export const AI_STREAM_DONE_CHANNEL = 'ai:streamDone' as const
export const AI_STREAM_ERROR_CHANNEL = 'ai:streamError' as const
