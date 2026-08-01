import {
  OPS_COMMAND_NAMES,
  type OpsCommandName,
  type OpsCommandPayload,
  type OpsCommandResultPayload,
  type OpsInboundPayload
} from './types.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isOpsCommandName(value: string): value is OpsCommandName {
  return (OPS_COMMAND_NAMES as readonly string[]).includes(value)
}

export function isOpsCommandPayload(value: unknown): value is OpsCommandPayload {
  if (!isRecord(value)) return false
  if (typeof value.requestId !== 'string' || !value.requestId) return false
  if (typeof value.groupId !== 'string' || !value.groupId) return false
  if (typeof value.targetDeviceId !== 'string' || !value.targetDeviceId) return false
  if (typeof value.command !== 'string' || !isOpsCommandName(value.command)) return false
  if (value.args !== undefined) {
    if (!Array.isArray(value.args) || !value.args.every((a) => typeof a === 'string')) {
      return false
    }
  }
  if (value.fileName !== undefined && typeof value.fileName !== 'string') return false
  if (value.dataBase64 !== undefined && typeof value.dataBase64 !== 'string') return false
  return true
}

export function isOpsCommandResultPayload(value: unknown): value is OpsCommandResultPayload {
  if (!isRecord(value)) return false
  if (typeof value.requestId !== 'string' || !value.requestId) return false
  if (typeof value.groupId !== 'string' || !value.groupId) return false
  if (typeof value.sourceDeviceId !== 'string' || !value.sourceDeviceId) return false
  if (typeof value.ok !== 'boolean') return false
  if (value.text !== undefined && typeof value.text !== 'string') return false
  if (value.fileName !== undefined && typeof value.fileName !== 'string') return false
  if (value.dataBase64 !== undefined && typeof value.dataBase64 !== 'string') return false
  if (value.error !== undefined && typeof value.error !== 'string') return false
  return true
}

export function isOpsInboundPayload(value: unknown): value is OpsInboundPayload {
  if (!isRecord(value)) return false
  if (typeof value.groupId !== 'string' || !value.groupId) return false
  if (typeof value.targetDeviceId !== 'string' || !value.targetDeviceId) return false
  if (typeof value.relativePath !== 'string') return false
  if (typeof value.fileName !== 'string' || !value.fileName) return false
  if (typeof value.dataBase64 !== 'string' || !value.dataBase64) return false
  return true
}
