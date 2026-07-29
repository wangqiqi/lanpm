import { readFileSync } from 'fs'
import { AI_IPC } from '../../src/shared/ai/channels.ts'
import { getPipelinePreset } from '../../src/shared/ai/pipelinePresets.ts'

const runner = readFileSync('src/main/ai/aiPipelineRunner.ts', 'utf8')
const repo = readFileSync('src/main/ai/aiPipelineRepository.ts', 'utf8')
const ipcAi = readFileSync('src/main/ipc/ai.ts', 'utf8')
const cockpit = readFileSync('src/renderer/src/views/CockpitView.tsx', 'utf8')
const assistant = readFileSync('src/renderer/src/features/ai/AiAssistantShell.tsx', 'utf8')
const preload = readFileSync('src/preload/index.ts', 'utf8')
const types = readFileSync('src/shared/ai/pipelineTypes.ts', 'utf8')
const docs = readFileSync('docs/AI接入.md', 'utf8')

for (const [name, src, needle] of [
  ['runner resume', runner, 'resumeAiPipeline'],
  ['runner cancel', runner, 'cancelAiPipeline'],
  ['runner remediate', runner, 'runTaskRemediateUntilPause'],
  ['repo payload', repo, 'parsePipelineStepsPayload'],
  ['ipc resume', ipcAi, 'resumePipeline'],
  ['ipc cancel', ipcAi, 'cancelPipeline'],
  ['types awaiting', types, 'awaiting_confirm'],
  ['types pending', types, 'pendingConfirm'],
  ['cockpit remediate', cockpit, "presetId: 'taskRemediate'"],
  ['cockpit modal', cockpit, 'resumePipeline'],
  ['assistant remediate', assistant, 'taskRemediate'],
  ['preload resume', preload, 'AI_IPC.resumePipeline'],
  ['docs section', docs, '### 6.5']
] as const) {
  if (!src.includes(needle)) {
    throw new Error(`${name} must include ${needle}`)
  }
}

if (!AI_IPC.resumePipeline || !AI_IPC.cancelPipeline) {
  throw new Error('AI_IPC must define resumePipeline and cancelPipeline')
}

const remediate = getPipelinePreset('taskRemediate')
const propose = remediate.steps.find((s) => s.stepId === 'proposeSubtasks')
if (!propose?.requiresHumanConfirm) {
  throw new Error('taskRemediate proposeSubtasks must require human confirm')
}

console.log('verify:ai-pipeline-human OK')
