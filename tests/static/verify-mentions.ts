/**
 * M2-03 @mention parsing smoke (no SQLite).
 * Run: npm run verify:mentions
 */
import { parseMentions, splitMentionSegments } from '../../src/shared/chat/mentions.ts'

const members = [
  { userId: 'user_b', displayName: 'Bob', mentionKeys: ['bob'] },
  { userId: 'user_a', displayName: 'Alice', mentionKeys: ['alice'] }
]

const ids = parseMentions('hi @Bob please review', members)
if (ids.length !== 1 || ids[0] !== 'user_b') {
  throw new Error(`parseMentions failed: ${ids.join(',')}`)
}

const segments = splitMentionSegments('hello @Alice', members)
const mentionSeg = segments.find((s) => s.kind === 'mention')
if (!mentionSeg || mentionSeg.userId !== 'user_a') {
  throw new Error('splitMentionSegments failed')
}

console.log('OK: parseMentions + splitMentionSegments')
