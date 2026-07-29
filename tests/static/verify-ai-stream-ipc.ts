import { readFileSync } from 'fs'

const preload = readFileSync('src/preload/index.ts', 'utf8')
const ipcAi = readFileSync('src/main/ipc/ai.ts', 'utf8')
const stream = readFileSync('src/main/ai/aiStreamService.ts', 'utf8')

if (!preload.includes('AI_IPC.streamChat')) {
  throw new Error('preload must wire AI_IPC.streamChat')
}
if (!preload.includes('AI_STREAM_CHUNK_CHANNEL')) {
  throw new Error('preload must listen for AI stream chunks')
}
if (!ipcAi.includes('runAiStreamChat')) {
  throw new Error('ai ipc must invoke runAiStreamChat')
}
if (!stream.includes('emitChunk')) {
  throw new Error('aiStreamService must emit IPC chunks')
}

console.log('verify:ai-stream-ipc OK')
