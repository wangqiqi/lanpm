import type { Database } from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import {
  OPS_BOT_DEVICE_ID,
  OPS_BOT_DISPLAY_NAME,
  OPS_BOT_REPLY_MAX_CHARS,
  OPS_BOT_USER_ID
} from '../../shared/ops/bot.ts'
import { getOpsGroupSettings } from './opsGroupSettingsStore.ts'
import { getAiConfig, getDecryptedApiKey } from '../ai/aiConfigService.ts'
import { getAiGateStatus } from '../ai/aiEndpointProbeService.ts'
import { publishChatMessage, type PublishChatMessageOptions } from '../chat/chatService.ts'
import { catchSyncFailure } from '../utils/reportSyncFailure.ts'

const OPS_BOT_SYSTEM = `你是 LanPM Ops 助手，只在群聊里做运维答疑。
规则：
- 用中文简短回答（不超过 ${OPS_BOT_REPLY_MAX_CHARS} 字）
- 优先建议具体 / 命令（/help /logs /status /disk /ps /tail /deploy）
- 不执行命令、不编造机器状态
- 复杂排查建议用户使用顶栏 AI 助手深入分析`

async function completeOpenAiOnce(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  userMessage: string
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage }
      ]
    })
  })
  if (!res.ok) {
    throw new Error(`AI upstream ${res.status}`)
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  return json.choices?.[0]?.message?.content?.trim() ?? ''
}

function stripBotMentions(text: string): string {
  return text
    .replace(/@(?:ops|Ops|助手|Ops助手)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateReply(text: string): string {
  if (text.length <= OPS_BOT_REPLY_MAX_CHARS) return text
  return `${text.slice(0, OPS_BOT_REPLY_MAX_CHARS - 1)}…`
}

const botPublishOptions: PublishChatMessageOptions = {
  senderOverride: { userId: OPS_BOT_USER_ID, deviceId: OPS_BOT_DEVICE_ID }
}

export function isOpsBotUserId(userId: string): boolean {
  return userId === OPS_BOT_USER_ID
}

export async function publishOpsBotText(db: Database, groupId: string, text: string): Promise<void> {
  await publishChatMessage(
    db,
    groupId,
    'text',
    { kind: 'text', text, meta: { source: 'ops-bot', requestId: `opsbot_${randomUUID()}` } },
    undefined,
    botPublishOptions
  )
}

/** 用户消息 @Ops 后触发 L2 短答（非流式） */
export async function maybeReplyAsOpsBot(
  db: Database,
  groupId: string,
  userText: string,
  mentionUserIds: string[]
): Promise<void> {
  if (!mentionUserIds.includes(OPS_BOT_USER_ID)) return
  const settings = getOpsGroupSettings(groupId)
  if (!settings.assistantEnabled) return

  const question = stripBotMentions(userText)
  if (!question) {
    await publishOpsBotText(
      db,
      groupId,
      '你好，我是 Ops 助手。可问我该用哪条命令，或输入 /help 查看机器与命令列表。'
    )
    return
  }

  const gate = getAiGateStatus(db)
  if (!gate.canStream) {
    await publishOpsBotText(db, groupId, 'AI 助手未配置或不可用，请先在驾驶舱配置 API Key 后再 @Ops。')
    return
  }

  const config = getAiConfig(db)
  const apiKey = getDecryptedApiKey(db)
  if (!config?.enabled || !apiKey) {
    await publishOpsBotText(db, groupId, '请先在驾驶舱启用并配置 AI 助手后再 @Ops。')
    return
  }

  try {
    const raw = await completeOpenAiOnce(
      config.baseUrl,
      apiKey,
      config.model,
      OPS_BOT_SYSTEM,
      question
    )
    const reply = truncateReply(raw || '暂时无法回答，请尝试 /help 或顶栏 AI 助手。')
    await publishOpsBotText(db, groupId, reply)
  } catch {
    await publishOpsBotText(db, groupId, 'AI 请求失败，请稍后重试或使用 /help。')
  }
}

/** fire-and-forget wrapper for chat send path */
export function scheduleOpsBotReply(
  db: Database,
  groupId: string,
  userText: string,
  mentionUserIds: string[]
): void {
  void maybeReplyAsOpsBot(db, groupId, userText, mentionUserIds).catch(
    catchSyncFailure('ops.botReply', { notify: false })
  )
}

export { OPS_BOT_USER_ID, OPS_BOT_DISPLAY_NAME }
