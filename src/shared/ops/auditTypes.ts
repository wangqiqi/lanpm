import type { OpsCommandName } from './types.ts'

export type OpsAuditStatus = 'pending' | 'ok' | 'failed'

export type OpsAuditEntry = {
  requestId: string
  groupId: string
  actorUserId: string
  actorName: string
  targetDeviceId: string
  command: OpsCommandName
  commandLine: string
  issuedAt: string
  status: OpsAuditStatus
  resultSummary?: string
  completedAt?: string
}

export function summarizeOpsCommandLine(command: OpsCommandName, args?: string[]): string {
  if (!args?.length) return `/${command}`
  if (command === 'tail') {
    const arg = args[0] ?? ''
    const base = arg.split(/[/\\]/).pop() ?? arg
    return `/tail ${base}`
  }
  return `/${command} ${args.join(' ')}`
}

export function summarizeOpsResult(input: {
  ok: boolean
  error?: string
  fileName?: string
  text?: string
}): string {
  if (!input.ok) return `failed: ${input.error ?? 'unknown'}`
  if (input.fileName) return `file: ${input.fileName}`
  if (input.text) {
    const first = input.text.split('\n')[0] ?? ''
    return first.length > 120 ? `${first.slice(0, 117)}...` : first
  }
  return 'ok'
}
