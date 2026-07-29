import type { WebContents } from 'electron'
import type { Database } from 'better-sqlite3'
import { throwLanpm } from '../../shared/errors/lanpmError.ts'
import {
  AI_STREAM_CHUNK_CHANNEL,
  AI_STREAM_DONE_CHANNEL,
  AI_STREAM_ERROR_CHANNEL
} from '../../shared/ai/channels.ts'
import type { AiGateStatus, AiStreamChatInput } from '../../shared/ai/types.ts'
import { getAiConfig, getDecryptedApiKey } from './aiConfigService.ts'
import {
  appendAiMessage,
  createAiThread,
  getAiThreadWithMessages,
  touchAiThreadTitle
} from './aiThreadService.ts'
import {
  assembleAiPrompt,
  assertPromptDesensitized,
  buildDesensitizedTaskContext,
  resolveTaskIdsFromMessage
} from './aiPromptService.ts'

function emitChunk(web: WebContents, requestId: string, delta: string): void {
  web.send(AI_STREAM_CHUNK_CHANNEL, { requestId, delta })
}

function emitDone(web: WebContents, requestId: string, threadId: string, assistantText: string): void {
  web.send(AI_STREAM_DONE_CHANNEL, { requestId, threadId, assistantText })
}

function emitError(web: WebContents, requestId: string, message: string): void {
  web.send(AI_STREAM_ERROR_CHANNEL, { requestId, message })
}

export function getAiGateStatus(db: Database): AiGateStatus {
  const config = getAiConfig(db)
  const hasApiKey = Boolean(config?.hasApiKey)
  const enabled = Boolean(config?.enabled)
  return {
    enabled,
    hasApiKey,
    canStream: enabled && hasApiKey
  }
}

async function* streamOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
): AsyncGenerator<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'system', content: system }, ...messages]
    })
  })
  if (!res.ok) {
    throw new Error(`AI upstream ${res.status}`)
  }
  const reader = res.body?.getReader()
  if (!reader) throw new Error('AI stream body missing')
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[]
        }
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // skip malformed SSE chunk
      }
    }
  }
}

export async function runAiStreamChat(
  db: Database,
  userId: string,
  web: WebContents,
  requestId: string,
  input: AiStreamChatInput
): Promise<void> {
  const gate = getAiGateStatus(db)
  if (!gate.canStream) {
    emitError(web, requestId, 'AI_NOT_AVAILABLE')
    return
  }
  const config = getAiConfig(db)!
  const apiKey = getDecryptedApiKey(db)
  if (!apiKey) {
    emitError(web, requestId, 'AI_NOT_AVAILABLE')
    return
  }

  const trimmed = input.userMessage.trim()
  if (!trimmed) {
    emitError(web, requestId, 'EMPTY_MESSAGE')
    return
  }

  let threadId = input.threadId
  let seedMarkdown = input.context?.seedMarkdown
  let history: { role: 'user' | 'assistant' | 'system'; content: string }[] = []

  if (threadId) {
    const existing = getAiThreadWithMessages(db, userId, threadId)
    seedMarkdown = seedMarkdown ?? existing.thread.context?.seedMarkdown
    history = existing.messages.map((m) => ({ role: m.role, content: m.content }))
  } else {
    const thread = createAiThread(db, userId, {
      groupId: input.groupId ?? null,
      title: input.createThreadTitle?.trim() || trimmed.slice(0, 40),
      context: input.context ?? null
    })
    threadId = thread.threadId
    seedMarkdown = input.context?.seedMarkdown
  }

  const groupId = input.groupId ?? null
  const taskIds = resolveTaskIdsFromMessage(db, groupId, trimmed, input.taskIds ?? [])
  const taskPayloads = buildDesensitizedTaskContext(db, groupId, taskIds)
  const prompt = assembleAiPrompt({
    seedMarkdown,
    history,
    userMessage: trimmed,
    taskPayloads
  })
  assertPromptDesensitized(prompt)

  appendAiMessage(db, userId, { threadId, role: 'user', content: trimmed })

  let assistantText = ''
  try {
    for await (const delta of streamOpenAiCompatible(
      config.baseUrl,
      apiKey,
      config.model,
      prompt.system,
      prompt.messages
    )) {
      assistantText += delta
      emitChunk(web, requestId, delta)
    }
  } catch (err) {
    emitError(web, requestId, err instanceof Error ? err.message : 'STREAM_FAILED')
    return
  }

  if (!assistantText.trim()) {
    assistantText = '（模型未返回内容）'
  }

  appendAiMessage(db, userId, { threadId, role: 'assistant', content: assistantText })
  if (!input.threadId) {
    touchAiThreadTitle(db, userId, threadId, trimmed.slice(0, 40))
  }
  emitDone(web, requestId, threadId, assistantText)
}

export async function mockAiStreamForVerify(
  web: WebContents,
  requestId: string,
  threadId: string
): Promise<void> {
  emitChunk(web, requestId, 'mock-')
  emitChunk(web, requestId, 'chunk')
  emitDone(web, requestId, threadId, 'mock-chunk')
}

export function assertAiStreamPreconditions(db: Database): void {
  const gate = getAiGateStatus(db)
  if (!gate.canStream) throwLanpm('err.aiNotAvailable')
}
