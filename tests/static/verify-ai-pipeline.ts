import { readFileSync } from 'fs'
import { AI_IPC } from '../../src/shared/ai/channels.ts'
import { getPipelinePreset } from '../../src/shared/ai/pipelinePresets.ts'

const runner = readFileSync('src/main/ai/aiPipelineRunner.ts', 'utf8')
const repo = readFileSync('src/main/ai/aiPipelineRepository.ts', 'utf8')
const ipcAi = readFileSync('src/main/ipc/ai.ts', 'utf8')
const schema = readFileSync('src/main/storage/schema.sql', 'utf8')
const cockpit = readFileSync('src/renderer/src/views/CockpitView.tsx', 'utf8')
const preload = readFileSync('src/preload/index.ts', 'utf8')

for (const [name, src, needle] of [
  ['runner', runner, 'runHealthCheckPipeline'],
  ['runner start', runner, 'startAiPipeline'],
  ['repository', repo, 'ai_pipeline_runs'],
  ['ipc start', ipcAi, 'startPipeline'],
  ['ipc get', ipcAi, 'getPipelineRun'],
  ['schema', schema, 'ai_pipeline_runs'],
  ['cockpit run', cockpit, "presetId: 'healthCheck'"],
  ['cockpit assistant', cockpit, "reportKind: 'healthCheck'"],
  ['preload', preload, 'AI_IPC.startPipeline']
] as const) {
  if (!src.includes(needle)) {
    throw new Error(`${name} must include ${needle}`)
  }
}

if (!AI_IPC.startPipeline || !AI_IPC.getPipelineRun || !AI_IPC.listPipelineRuns) {
  throw new Error('AI_IPC must define pipeline channels')
}

const preset = getPipelinePreset('healthCheck')
if (preset.steps.length !== 4) {
  throw new Error('healthCheck preset must define 4 steps')
}

console.log('verify:ai-pipeline OK')
