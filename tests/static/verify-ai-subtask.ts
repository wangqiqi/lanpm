import { readFileSync } from 'fs'
import { AI_IPC } from '../../src/shared/ai/channels.ts'

const preload = readFileSync('src/preload/index.ts', 'utf8')
const ipcAi = readFileSync('src/main/ipc/ai.ts', 'utf8')
const subtaskService = readFileSync('src/main/ai/aiSubtaskService.ts', 'utf8')
const modal = readFileSync('src/renderer/src/features/ai/SubtaskPreviewModal.tsx', 'utf8')
const taskDetail = readFileSync('src/renderer/src/features/tree/TaskDetailPanel.tsx', 'utf8')

for (const [name, src, needle] of [
  ['preload', preload, 'AI_IPC.proposeSubtasks'],
  ['preload confirm', preload, 'AI_IPC.confirmSubtasks'],
  ['ipc ai', ipcAi, 'proposeSubtasks'],
  ['ipc confirm', ipcAi, 'confirmSubtasks'],
  ['subtask service', subtaskService, 'parseAiSubtaskLlmJson'],
  ['modal', modal, 'SubtaskPreviewModal'],
  ['task detail', taskDetail, "t('ai.splitSubtasks')"]
] as const) {
  if (!src.includes(needle)) {
    throw new Error(`${name} must include ${needle}`)
  }
}

if (!AI_IPC.proposeSubtasks || !AI_IPC.confirmSubtasks) {
  throw new Error('AI_IPC must define proposeSubtasks and confirmSubtasks')
}

console.log('verify:ai-subtask OK')
