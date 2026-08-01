import { OPS_COMMAND_NAMES, type OpsCommandName } from '../ops/types.ts'

export type ParsedOpsCommand = {
  command: OpsCommandName
  args: string[]
  targetDisplayName?: string
}

/** Parse `@prod-web-01 /logs app` or `/help` */
export function parseOpsCommand(text: string): ParsedOpsCommand | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('/')) {
    const atMatch = /^@(\S+)\s+(\/.+)$/.exec(trimmed)
    if (!atMatch) return null
    const inner = parseOpsSlash(atMatch[2] ?? '')
    if (!inner) return null
    return { ...inner, targetDisplayName: atMatch[1] }
  }
  const slash = parseOpsSlash(trimmed)
  return slash
}

function parseOpsSlash(text: string): ParsedOpsCommand | null {
  const parts = text.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  const head = parts[0] ?? ''
  if (!head.startsWith('/')) return null
  const name = head.slice(1).toLowerCase()
  if (!(OPS_COMMAND_NAMES as readonly string[]).includes(name)) return null
  return {
    command: name as OpsCommandName,
    args: parts.slice(1)
  }
}

export function isOpsCommandDraft(text: string): boolean {
  const t = text.trimStart()
  if (t.startsWith('/')) {
    const cmd = t.split(/\s+/)[0]?.slice(1).toLowerCase()
    return (OPS_COMMAND_NAMES as readonly string[]).includes(cmd ?? '')
  }
  return /^@\S+\s+\//.test(t)
}

/** Composer `/` 草稿命令补全提示 */
export function suggestOpsSlashCompletion(draft: string): string | null {
  const trimmed = draft.trimStart()
  if (!trimmed.startsWith('/')) return null
  const parts = trimmed.split(/\s+/)
  if (parts.length > 1) return null
  const partial = (parts[0] ?? '').slice(1).toLowerCase()
  if (!partial) return null
  const matches = OPS_COMMAND_NAMES.filter((n) => n.startsWith(partial))
  if (matches.length === 1 && matches[0] !== partial) return `/${matches[0]}`
  return null
}

export function listOpsCommandSuggestions(partialCommand?: string): string[] {
  const p = (partialCommand ?? '').toLowerCase()
  if (!p) return [...OPS_COMMAND_NAMES].map((n) => `/${n}`)
  return OPS_COMMAND_NAMES.filter((n) => n.startsWith(p)).map((n) => `/${n}`)
}
