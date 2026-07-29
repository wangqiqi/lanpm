import { readFileSync } from 'fs'
import { AI_IPC } from '../../src/shared/ai/channels.ts'

const patrolService = readFileSync('src/main/ai/aiPatrolService.ts', 'utf8')
const scheduler = readFileSync('src/main/ai/aiPatrolScheduler.ts', 'utf8')
const ipcAi = readFileSync('src/main/ipc/ai.ts', 'utf8')
const mainIndex = readFileSync('src/main/index.ts', 'utf8')
const schema = readFileSync('src/main/storage/schema.sql', 'utf8')

for (const [name, src, needle] of [
  ['patrol service', patrolService, 'scanPatrolFindings'],
  ['patrol service run', patrolService, 'runAiPatrol'],
  ['scheduler', scheduler, 'initAiPatrolScheduler'],
  ['scheduler notify', scheduler, 'showDesktopNotification'],
  ['ipc list', ipcAi, 'listPatrolRuns'],
  ['main init', mainIndex, 'initAiPatrolScheduler'],
  ['schema table', schema, 'ai_patrol_runs'],
  ['schema patrol config', schema, 'patrol_enabled']
] as const) {
  if (!src.includes(needle)) {
    throw new Error(`${name} must include ${needle}`)
  }
}

if (!AI_IPC.listPatrolRuns || !AI_IPC.getLatestPatrolRun) {
  throw new Error('AI_IPC must define patrol channels')
}

console.log('verify:ai-patrol OK')
