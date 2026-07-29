import { readFileSync } from 'fs'

if (!readFileSync('tests/unit/ai/aiPromptService.test.ts', 'utf8').includes('assertPromptDesensitized')) {
  throw new Error('missing ai desensitize unit test')
}

console.log('verify:ai-desensitize OK')
