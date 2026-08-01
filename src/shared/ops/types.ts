export type OpsDeviceKind = 'human' | 'machine'

export const OPS_COMMAND_NAMES = ['help', 'logs', 'status', 'deploy'] as const
export type OpsCommandName = (typeof OPS_COMMAND_NAMES)[number]

export type OpsCommandPayload = {
  requestId: string
  groupId: string
  targetDeviceId: string
  command: OpsCommandName
  args?: string[]
  /** deploy: optional inline file */
  fileName?: string
  dataBase64?: string
}

export type OpsCommandResultPayload = {
  requestId: string
  groupId: string
  sourceDeviceId: string
  ok: boolean
  text?: string
  fileName?: string
  dataBase64?: string
  error?: string
}

export type OpsInboundPayload = {
  groupId: string
  targetDeviceId: string
  relativePath: string
  fileName: string
  dataBase64: string
}

export type OpsMachineRecord = {
  deviceId: string
  displayName: string
  groupIds: string[]
  online: boolean
  inboundDir: string
  outboundPaths: Record<string, string>
  root: string
}

export const OPS_SYSTEM_EVENTS = {
  machineOnline: 'ops.machine.online',
  machineOffline: 'ops.machine.offline',
  commandResult: 'ops.command.result'
} as const
