import { readFileSync } from 'fs'

const shell = readFileSync('src/renderer/src/features/ai/AiAssistantShell.tsx', 'utf8')

const required = [
  'getGateStatus',
  'navigator.onLine',
  'ai.gateDisabled',
  'ai.gateOffline',
  'ai.gateEndpointUnreachable',
  'canSend'
]
for (const token of required) {
  if (!shell.includes(token)) {
    throw new Error(`AiAssistantShell missing offline gate token: ${token}`)
  }
}

console.log('verify:ai-offline-gate OK')
