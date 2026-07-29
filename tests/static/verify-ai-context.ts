import { readFileSync } from 'fs'

const promptSrc = readFileSync('src/main/ai/aiPromptService.ts', 'utf8')
const streamSrc = readFileSync('src/main/ai/aiStreamService.ts', 'utf8')
const typesSrc = readFileSync('src/shared/ai/types.ts', 'utf8')

const required = [
  'buildGroupAiSummary',
  'formatAiGroupSummary',
  'currentUserDisplayName',
  'entrySource',
  'daysUntilDeadline',
  'scheduleHealth',
  'checklistItems',
  'contextTaskId',
  'groupSummary'
] as const

for (const token of required) {
  const inPrompt = promptSrc.includes(token)
  const inStream = streamSrc.includes(token)
  const inTypes = typesSrc.includes(token)
  if (!inPrompt && !inStream && !inTypes) {
    throw new Error(`verify:ai-context missing token: ${token}`)
  }
}

if (!readFileSync('tests/unit/ai/aiPromptService.test.ts', 'utf8').includes('groupSummary')) {
  throw new Error('verify:ai-context missing groupSummary unit test')
}

console.log('verify:ai-context OK')
