import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { AI_IPC } from '../../shared/ai/channels.ts'
import type {
  AiShareToChatInput,
  AiStreamChatInput,
  AiStructuredReviewInput,
  AppendAiMessageInput,
  CreateAiThreadInput,
  ListAiThreadsInput
} from '../../shared/ai/types.ts'
import type {
  AiConfirmSubtasksInput,
  AiProposeSubtasksInput
} from '../../shared/ai/subtaskSchemas.ts'
import type { AiProbeEndpointInput } from '../../shared/ai/endpointProbe.ts'
import { getDatabase } from '../storage/index.ts'
import { getSetupStatus } from '../identity/setup.ts'
import { throwLanpm } from '../../shared/errors/lanpmError.ts'
import {
  appendAiMessage,
  createAiThread,
  deleteAiThread,
  getAiThreadWithMessages,
  listAiThreads
} from '../ai/aiThreadService.ts'
import { getAiGateStatus, probeAiEndpoint } from '../ai/aiEndpointProbeService.ts'
import { runAiStreamChat } from '../ai/aiStreamService.ts'
import { reviewTaskStructured } from '../ai/aiReviewService.ts'
import { confirmSubtasks, proposeSubtasks } from '../ai/aiSubtaskService.ts'
import { getLatestPatrolRun, listPatrolRuns } from '../ai/aiPatrolScheduler.ts'
import {
  cancelAiPipeline,
  resumeAiPipeline,
  startAiPipeline
} from '../ai/aiPipelineRunner.ts'
import {
  getLatestPipelineRun,
  getPipelineRun,
  listPipelineRuns
} from '../ai/aiPipelineRepository.ts'
import type {
  AiCancelPipelineInput,
  AiResumePipelineInput,
  AiStartPipelineInput
} from '../../shared/ai/pipelineTypes.ts'
import { sendAiShareMessage } from '../chat/chatService.ts'

function requireUserId(): string {
  const status = getSetupStatus(getDatabase())
  if (!status.configured || !status.user?.userId) throwLanpm('stub.identityRequired')
  return status.user.userId
}

export function registerAiIpc(): void {
  ipcMain.handle(AI_IPC.listThreads, (_event, input?: ListAiThreadsInput) => {
    const userId = requireUserId()
    return listAiThreads(getDatabase(), userId, input ?? {})
  })

  ipcMain.handle(AI_IPC.getThread, (_event, threadId: string) => {
    const userId = requireUserId()
    return getAiThreadWithMessages(getDatabase(), userId, threadId)
  })

  ipcMain.handle(AI_IPC.createThread, (_event, input?: CreateAiThreadInput) => {
    const userId = requireUserId()
    return createAiThread(getDatabase(), userId, input ?? {})
  })

  ipcMain.handle(AI_IPC.appendMessage, (_event, input: AppendAiMessageInput) => {
    const userId = requireUserId()
    return appendAiMessage(getDatabase(), userId, input)
  })

  ipcMain.handle(AI_IPC.deleteThread, (_event, threadId: string) => {
    const userId = requireUserId()
    deleteAiThread(getDatabase(), userId, threadId)
    return { ok: true }
  })

  ipcMain.handle(AI_IPC.getGateStatus, () => getAiGateStatus(getDatabase()))

  ipcMain.handle(AI_IPC.probeEndpoint, (_event, input?: AiProbeEndpointInput) => {
    return probeAiEndpoint(getDatabase(), { ...input, force: true })
  })

  ipcMain.handle(AI_IPC.streamChat, async (event, input: AiStreamChatInput) => {
    const userId = requireUserId()
    const requestId = `aireq_${randomUUID()}`
    const web = event.sender
    void runAiStreamChat(getDatabase(), userId, web, requestId, input)
    return { requestId }
  })

  ipcMain.handle(AI_IPC.reviewTask, (_event, input: AiStructuredReviewInput) => {
    return reviewTaskStructured(getDatabase(), input.groupId, input.taskId)
  })

  ipcMain.handle(AI_IPC.shareToChat, async (_event, input: AiShareToChatInput) => {
    return sendAiShareMessage(
      getDatabase(),
      input.groupId,
      input.markdown,
      input.threadId
    )
  })

  ipcMain.handle(AI_IPC.proposeSubtasks, (_event, input: AiProposeSubtasksInput) => {
    return proposeSubtasks(getDatabase(), input)
  })

  ipcMain.handle(AI_IPC.confirmSubtasks, (_event, input: AiConfirmSubtasksInput) => {
    return confirmSubtasks(getDatabase(), input)
  })

  ipcMain.handle(AI_IPC.listPatrolRuns, (_event, limit?: number) => {
    return listPatrolRuns(getDatabase(), typeof limit === 'number' ? limit : 10)
  })

  ipcMain.handle(AI_IPC.getLatestPatrolRun, () => {
    return getLatestPatrolRun(getDatabase())
  })

  ipcMain.handle(AI_IPC.startPipeline, async (_event, input: AiStartPipelineInput) => {
    const userId = requireUserId()
    return startAiPipeline(getDatabase(), userId, input)
  })

  ipcMain.handle(AI_IPC.resumePipeline, async (_event, input: AiResumePipelineInput) => {
    const userId = requireUserId()
    return resumeAiPipeline(getDatabase(), userId, input)
  })

  ipcMain.handle(AI_IPC.cancelPipeline, async (_event, input: AiCancelPipelineInput) => {
    const userId = requireUserId()
    return cancelAiPipeline(getDatabase(), userId, input)
  })

  ipcMain.handle(AI_IPC.getPipelineRun, (_event, runId: string) => {
    const userId = requireUserId()
    return getPipelineRun(getDatabase(), userId, runId)
  })

  ipcMain.handle(AI_IPC.listPipelineRuns, (_event, limit?: number) => {
    const userId = requireUserId()
    return listPipelineRuns(getDatabase(), userId, typeof limit === 'number' ? limit : 10)
  })
}
