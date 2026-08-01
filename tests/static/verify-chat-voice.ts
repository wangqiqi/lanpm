/**
 * meeting-media-v2 — voice MessageType guards.
 * Run: npm run verify:chat-voice
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const types = readFileSync(join(root, 'src/shared/chat/types.ts'), 'utf8')
assert.match(types, /'voice'/)
assert.match(types, /kind: 'voice'/)

const chatService = readFileSync(join(root, 'src/main/chat/chatService.ts'), 'utf8')
assert.match(chatService, /sendVoiceMessage/)
assert.match(chatService, /uploadFileFromBuffer/)

const voicePanel = readFileSync(
  join(root, 'src/renderer/src/features/chat/ChatVoiceMediaPanel.tsx'),
  'utf8'
)
assert.match(voicePanel, /chat-voice-hold-btn/)
assert.match(voicePanel, /sendVoice/)

const bubble = readFileSync(
  join(root, 'src/renderer/src/features/chat/MessageBubble.tsx'),
  'utf8'
)
assert.match(bubble, /VoiceMessageBubble/)
assert.match(bubble, /kind === 'voice'/)

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
assert.ok(pkg.scripts?.['verify:chat-voice'], 'missing verify:chat-voice script')

console.log('verify:chat-voice OK')
