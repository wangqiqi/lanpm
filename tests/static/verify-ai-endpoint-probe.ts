import { readFileSync } from 'fs'
import { AI_IPC } from '../../src/shared/ai/channels.ts'

const probeService = readFileSync('src/main/ai/aiEndpointProbeService.ts', 'utf8')
const shared = readFileSync('src/shared/ai/endpointProbe.ts', 'utf8')
const ipcAi = readFileSync('src/main/ipc/ai.ts', 'utf8')
const preload = readFileSync('src/preload/index.ts', 'utf8')
const shell = readFileSync('src/renderer/src/features/ai/AiAssistantShell.tsx', 'utf8')
const modal = readFileSync('src/renderer/src/features/cockpit/AiConfigModal.tsx', 'utf8')
const mainIndex = readFileSync('src/main/index.ts', 'utf8')

for (const [name, src, needle] of [
  ['probe service', probeService, 'probeAiEndpoint'],
  ['probe service gate', probeService, 'getAiGateStatus'],
  ['shared ttl', shared, 'AI_ENDPOINT_PROBE_SUCCESS_TTL_MS'],
  ['ipc', ipcAi, 'AI_IPC.probeEndpoint'],
  ['preload', preload, 'AI_IPC.probeEndpoint'],
  ['shell', shell, 'ai.gateEndpointUnreachable'],
  ['modal', modal, 'ai.probeConnection'],
  ['main init', mainIndex, 'initAiEndpointProbeScheduler']
] as const) {
  if (!src.includes(needle)) {
    throw new Error(`${name} must include ${needle}`)
  }
}

if (!AI_IPC.probeEndpoint) {
  throw new Error('AI_IPC must define probeEndpoint')
}

console.log('verify:ai-endpoint-probe OK')
