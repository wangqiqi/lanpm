export const AI_IPC = {
  listThreads: 'ai:listThreads',
  getThread: 'ai:getThread',
  createThread: 'ai:createThread',
  appendMessage: 'ai:appendMessage',
  deleteThread: 'ai:deleteThread',
  getGateStatus: 'ai:getGateStatus',
  probeEndpoint: 'ai:probeEndpoint',
  streamChat: 'ai:streamChat',
  reviewTask: 'ai:reviewTask',
  shareToChat: 'ai:shareToChat',
  proposeSubtasks: 'ai:proposeSubtasks',
  confirmSubtasks: 'ai:confirmSubtasks',
  listPatrolRuns: 'ai:listPatrolRuns',
  getLatestPatrolRun: 'ai:getLatestPatrolRun',
  startPipeline: 'ai:startPipeline',
  getPipelineRun: 'ai:getPipelineRun',
  listPipelineRuns: 'ai:listPipelineRuns'
} as const

export const AI_STREAM_CHUNK_CHANNEL = 'ai:streamChunk' as const
export const AI_STREAM_DONE_CHANNEL = 'ai:streamDone' as const
export const AI_STREAM_ERROR_CHANNEL = 'ai:streamError' as const
