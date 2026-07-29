import { readFileSync } from 'fs'
import { formatPatrolSeedMarkdown } from '../../src/shared/ai/patrolFormat.ts'
import { AI_PROMPT_PRESETS } from '../../src/shared/ai/promptPresets.ts'

const cockpit = readFileSync('src/renderer/src/views/CockpitView.tsx', 'utf8')
const shell = readFileSync('src/renderer/src/features/ai/AiAssistantShell.tsx', 'utf8')
const types = readFileSync('src/shared/ai/types.ts', 'utf8')

for (const [name, src, needle] of [
  ['cockpit patrol continue', cockpit, 'formatPatrolSeedMarkdown'],
  ['cockpit patrol assistant', cockpit, "reportKind: 'patrol'"],
  ['assistant split button', shell, "t('ai.splitSubtasks')"],
  ['assistant subtask modal', shell, 'SubtaskPreviewModal'],
  ['assistant resolve task', shell, 'resolveAssistantTaskId'],
  ['types patrol kind', types, "'patrol'"]
] as const) {
  if (!src.includes(needle)) {
    throw new Error(`${name} must include ${needle}`)
  }
}

const presetIds = AI_PROMPT_PRESETS.map((p) => p.id)
for (const id of ['splitSubtasks', 'patrolFollowUp'] as const) {
  if (!presetIds.includes(id)) {
    throw new Error(`AI_PROMPT_PRESETS must include ${id}`)
  }
}

const empty = formatPatrolSeedMarkdown({
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '2026-01-01T00:00:01.000Z',
  summary: 'ok',
  findings: [],
  usedExternalAi: false
})
if (!empty.includes('定时巡检报告')) {
  throw new Error('formatPatrolSeedMarkdown must render patrol heading')
}

console.log('verify:ai-assistant-patrol-subtask OK')
