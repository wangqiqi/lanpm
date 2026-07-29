import { readFileSync } from 'fs'

const service = readFileSync('src/main/ai/aiThreadService.ts', 'utf8')
const schema = readFileSync('src/main/storage/schema.sql', 'utf8')

const required = ['createAiThread', 'listAiThreads', 'appendAiMessage', 'user_id', 'group_id']
for (const token of required) {
  if (!service.includes(token) && !schema.includes(token)) {
    throw new Error(`ai thread service/schema missing: ${token}`)
  }
}
if (!schema.includes('ai_threads') || !schema.includes('ai_messages')) {
  throw new Error('schema.sql must define ai_threads and ai_messages')
}

console.log('verify:ai-thread-service OK')
