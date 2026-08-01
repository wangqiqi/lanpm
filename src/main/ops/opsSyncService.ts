import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import type { SyncEnvelope } from '../../shared/network/types.ts'
import { getNetworkTransport } from '../network/index.ts'
import { getSetupStatus } from '../identity/setup.ts'
import { listUserGroups } from '../group/groupService.ts'
import { catchSyncFailure } from '../utils/reportSyncFailure.ts'
import {
  isOpsCommandPayload,
  isOpsCommandResultPayload,
  isOpsInboundPayload
} from '../../shared/ops/validate.ts'
import type {
  OpsCommandPayload,
  OpsCommandResultPayload,
  OpsInboundPayload,
  OpsMachineRecord
} from '../../shared/ops/types.ts'
import { OPS_SYSTEM_EVENTS } from '../../shared/ops/types.ts'
import { executeOpsCommand } from './commandExecutor.ts'
import {
  appendOpsAuditEntry,
  completeOpsAuditEntry
} from './auditStore.ts'
import { summarizeOpsCommandLine, summarizeOpsResult } from '../../shared/ops/auditTypes.ts'
import {
  gatewayPathsFromMachine,
  getOpsMachine,
  listOpsMachines,
  machineUserId,
  setOpsMachineOnline,
  upsertOpsMachine,
  createOpsMachineRecord
} from './opsMachineStore.ts'
import { writeGatewayFile } from '../gateway/fileStore.ts'
import { publishChatMessage } from '../chat/chatService.ts'
import { sendFileMessage } from '../chat/chatService.ts'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFileSync, unlinkSync } from 'node:fs'

const subscribedGroups = new Map<string, () => void>()

async function publishOpsEnvelope(
  db: Database,
  groupId: string,
  type: SyncEnvelope['type'],
  payload: unknown
): Promise<void> {
  const transport = getNetworkTransport()
  const status = getSetupStatus(db)
  if (!transport || !status.configured || !status.user || !status.device) return

  const envelope: SyncEnvelope = {
    version: 1,
    type,
    msgId: `${type}_${randomUUID()}`,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    groupId,
    ts: new Date().toISOString(),
    payload,
    nonce: '',
    authTag: ''
  }
  await transport.publish(envelope)
}

async function publishOpsSystem(
  db: Database,
  groupId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  await publishChatMessage(db, groupId, 'system', {
    kind: 'system',
    event,
    payload
  })
}

async function handleOpsCommand(db: Database, envelope: SyncEnvelope): Promise<void> {
  if (envelope.type !== 'ops_command' || !envelope.groupId) return
  if (!isOpsCommandPayload(envelope.payload)) return

  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return

  const payload = envelope.payload
  if (payload.targetDeviceId !== status.device.deviceId) return

  const machine = getOpsMachine(status.device.deviceId)
  if (!machine) return

  const result = await executeOpsCommand(gatewayPathsFromMachine(machine), payload)
  const response: OpsCommandResultPayload = {
    requestId: payload.requestId,
    groupId: envelope.groupId,
    sourceDeviceId: status.device.deviceId,
    ok: result.ok,
    text: result.text,
    fileName: result.fileName,
    dataBase64: result.dataBase64,
    error: result.error
  }
  await publishOpsEnvelope(db, envelope.groupId, 'ops_command_result', response)
}

async function handleOpsCommandResult(db: Database, envelope: SyncEnvelope): Promise<void> {
  if (envelope.type !== 'ops_command_result' || !envelope.groupId) return
  if (!isOpsCommandResultPayload(envelope.payload)) return

  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return

  const payload = envelope.payload
  if (!payload.ok) {
    completeOpsAuditEntry(payload.requestId, {
      status: 'failed',
      resultSummary: summarizeOpsResult(payload),
      completedAt: new Date().toISOString()
    })
    await publishOpsSystem(db, envelope.groupId, OPS_SYSTEM_EVENTS.commandResult, {
      error: payload.error ?? 'ops_failed',
      requestId: payload.requestId
    })
    return
  }

  completeOpsAuditEntry(payload.requestId, {
    status: 'ok',
    resultSummary: summarizeOpsResult(payload),
    completedAt: new Date().toISOString()
  })

  if (payload.dataBase64 && payload.fileName) {
    const tmp = join(tmpdir(), `lanpm-ops-${randomUUID()}-${payload.fileName}`)
    writeFileSync(tmp, Buffer.from(payload.dataBase64, 'base64'))
    try {
      await sendFileMessage(db, envelope.groupId, tmp)
    } finally {
      try {
        unlinkSync(tmp)
      } catch {
        /* ignore */
      }
    }
    return
  }

  if (payload.text) {
    await publishChatMessage(db, envelope.groupId, 'text', {
      kind: 'text',
      text: payload.text,
      meta: { source: 'ops-agent', requestId: payload.requestId }
    })
  }
}

async function handleOpsInbound(db: Database, envelope: SyncEnvelope): Promise<void> {
  if (envelope.type !== 'ops_inbound' || !envelope.groupId) return
  if (!isOpsInboundPayload(envelope.payload)) return

  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return
  if (envelope.senderDeviceId === status.device.deviceId) return

  const payload = envelope.payload
  if (payload.targetDeviceId !== status.device.deviceId) return
  const machine = getOpsMachine(status.device.deviceId)
  if (!machine) return

  const paths = gatewayPathsFromMachine(machine)
  const rel = payload.relativePath || `${paths.inboundDir}/${payload.fileName}`
  await writeGatewayFile(paths, rel, Buffer.from(payload.dataBase64, 'base64'))
}

function handleIncoming(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type === 'ops_command') {
    void handleOpsCommand(db, envelope).catch(
      catchSyncFailure('ops.handleCommand', { notify: false })
    )
    return
  }
  if (envelope.type === 'ops_command_result') {
    void handleOpsCommandResult(db, envelope).catch(
      catchSyncFailure('ops.handleCommandResult', { notify: false })
    )
    return
  }
  if (envelope.type === 'ops_inbound') {
    void handleOpsInbound(db, envelope).catch(
      catchSyncFailure('ops.handleInbound', { notify: false })
    )
  }
}

function ensureSubscribed(db: Database, groupId: string): void {
  if (subscribedGroups.has(groupId)) return
  const transport = getNetworkTransport()
  if (!transport) return
  const unsub = transport.subscribe(groupId, (env) => handleIncoming(db, env))
  subscribedGroups.set(groupId, unsub)
}

export function initOpsSyncService(db: Database): void {
  const transport = getNetworkTransport()
  if (!transport) return
  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()
  for (const group of listUserGroups(db)) {
    ensureSubscribed(db, group.groupId)
  }
}

export function shutdownOpsSyncService(): void {
  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()
}

export async function sendOpsCommand(
  db: Database,
  groupId: string,
  payload: Omit<OpsCommandPayload, 'requestId' | 'groupId'>
): Promise<{ requestId: string }> {
  const requestId = `ops_${randomUUID()}`
  const full: OpsCommandPayload = { ...payload, requestId, groupId }
  const status = getSetupStatus(db)
  appendOpsAuditEntry({
    requestId,
    groupId,
    actorUserId: status.user?.userId ?? 'unknown',
    actorName: status.user?.displayName ?? status.user?.userId ?? 'unknown',
    targetDeviceId: payload.targetDeviceId,
    command: payload.command,
    commandLine: summarizeOpsCommandLine(payload.command, payload.args),
    issuedAt: new Date().toISOString(),
    status: 'pending'
  })
  await publishOpsEnvelope(db, groupId, 'ops_command', full)
  return { requestId }
}

export async function publishOpsInbound(
  db: Database,
  groupId: string,
  targetDeviceId: string,
  fileName: string,
  dataBase64: string,
  relativePath?: string
): Promise<void> {
  const payload: OpsInboundPayload = {
    groupId,
    targetDeviceId,
    fileName,
    dataBase64,
    relativePath: relativePath ?? `inbound/${fileName}`
  }
  await publishOpsEnvelope(db, groupId, 'ops_inbound', payload)
}

export async function registerLocalOpsAgent(
  db: Database,
  args: {
    deviceId: string
    displayName: string
    groupIds: string[]
    root?: string
  }
): Promise<OpsMachineRecord> {
  const record = upsertOpsMachine(
    createOpsMachineRecord({
      deviceId: args.deviceId,
      displayName: args.displayName,
      groupIds: args.groupIds,
      root: args.root
    })
  )

  for (const groupId of args.groupIds) {
    await publishOpsSystem(db, groupId, OPS_SYSTEM_EVENTS.machineOnline, {
      deviceId: args.deviceId,
      displayName: args.displayName
    })
    ensureSubscribed(db, groupId)
  }
  return record
}

export async function markOpsAgentOffline(
  db: Database,
  deviceId: string
): Promise<void> {
  const machine = setOpsMachineOnline(deviceId, false)
  if (!machine) return
  for (const groupId of machine.groupIds) {
    await publishOpsSystem(db, groupId, OPS_SYSTEM_EVENTS.machineOffline, {
      deviceId,
      displayName: machine.displayName
    })
  }
}

export { listOpsMachines, machineUserId, getOpsMachine }
