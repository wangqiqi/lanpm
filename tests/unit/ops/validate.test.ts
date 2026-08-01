import { describe, expect, it } from 'vitest'
import {
  isOpsCommandName,
  isOpsCommandPayload,
  isOpsCommandResultPayload,
  isOpsInboundPayload
} from '../../../src/shared/ops/validate.ts'

describe('ops validate', () => {
  const validCommand = {
    requestId: 'r1',
    groupId: 'g1',
    targetDeviceId: 'd1',
    command: 'status' as const
  }

  it('checks command names', () => {
    expect(isOpsCommandName('status')).toBe(true)
    expect(isOpsCommandName('unknown')).toBe(false)
  })

  it('accepts valid OpsCommandPayload', () => {
    expect(isOpsCommandPayload(validCommand)).toBe(true)
    expect(
      isOpsCommandPayload({
        ...validCommand,
        args: ['outbound/logs/app.log'],
        fileName: 'app.log',
        dataBase64: 'YQ=='
      })
    ).toBe(true)
  })

  it('rejects invalid OpsCommandPayload', () => {
    expect(isOpsCommandPayload(null)).toBe(false)
    expect(isOpsCommandPayload({ ...validCommand, requestId: '' })).toBe(false)
    expect(isOpsCommandPayload({ ...validCommand, groupId: '' })).toBe(false)
    expect(isOpsCommandPayload({ ...validCommand, targetDeviceId: '' })).toBe(false)
    expect(isOpsCommandPayload({ ...validCommand, command: 'bad' })).toBe(false)
    expect(isOpsCommandPayload({ ...validCommand, args: ['ok', 1] })).toBe(false)
    expect(isOpsCommandPayload({ ...validCommand, fileName: 1 })).toBe(false)
    expect(isOpsCommandPayload({ ...validCommand, dataBase64: 1 })).toBe(false)
  })

  it('accepts valid OpsCommandResultPayload', () => {
    expect(
      isOpsCommandResultPayload({
        requestId: 'r1',
        groupId: 'g1',
        sourceDeviceId: 'd1',
        ok: true,
        text: 'ok',
        fileName: 'a.txt',
        dataBase64: 'YQ=='
      })
    ).toBe(true)
    expect(
      isOpsCommandResultPayload({
        requestId: 'r1',
        groupId: 'g1',
        sourceDeviceId: 'd1',
        ok: false,
        error: 'PATH_FORBIDDEN'
      })
    ).toBe(true)
  })

  it('rejects invalid OpsCommandResultPayload', () => {
    expect(isOpsCommandResultPayload(null)).toBe(false)
    expect(
      isOpsCommandResultPayload({
        requestId: '',
        groupId: 'g1',
        sourceDeviceId: 'd1',
        ok: true
      })
    ).toBe(false)
    expect(
      isOpsCommandResultPayload({
        requestId: 'r1',
        groupId: 'g1',
        sourceDeviceId: 'd1',
        ok: 'yes'
      })
    ).toBe(false)
    expect(
      isOpsCommandResultPayload({
        requestId: 'r1',
        groupId: 'g1',
        sourceDeviceId: 'd1',
        ok: true,
        text: 1
      })
    ).toBe(false)
    expect(
      isOpsCommandResultPayload({
        requestId: 'r1',
        groupId: 'g1',
        sourceDeviceId: 'd1',
        ok: true,
        fileName: 1
      })
    ).toBe(false)
    expect(
      isOpsCommandResultPayload({
        requestId: 'r1',
        groupId: 'g1',
        sourceDeviceId: 'd1',
        ok: true,
        dataBase64: 1
      })
    ).toBe(false)
    expect(
      isOpsCommandResultPayload({
        requestId: 'r1',
        groupId: 'g1',
        sourceDeviceId: 'd1',
        ok: true,
        error: 1
      })
    ).toBe(false)
  })

  it('accepts valid OpsInboundPayload', () => {
    expect(
      isOpsInboundPayload({
        groupId: 'g1',
        targetDeviceId: 'd1',
        relativePath: 'outbound',
        fileName: 'app.log',
        dataBase64: 'YQ=='
      })
    ).toBe(true)
  })

  it('rejects invalid OpsInboundPayload', () => {
    expect(isOpsInboundPayload(null)).toBe(false)
    expect(
      isOpsInboundPayload({
        groupId: '',
        targetDeviceId: 'd1',
        relativePath: '',
        fileName: 'a',
        dataBase64: 'YQ=='
      })
    ).toBe(false)
    expect(
      isOpsInboundPayload({
        groupId: 'g1',
        targetDeviceId: '',
        relativePath: '',
        fileName: 'a',
        dataBase64: 'YQ=='
      })
    ).toBe(false)
    expect(
      isOpsInboundPayload({
        groupId: 'g1',
        targetDeviceId: 'd1',
        relativePath: 1,
        fileName: 'a',
        dataBase64: 'YQ=='
      })
    ).toBe(false)
    expect(
      isOpsInboundPayload({
        groupId: 'g1',
        targetDeviceId: 'd1',
        relativePath: '',
        fileName: '',
        dataBase64: 'YQ=='
      })
    ).toBe(false)
    expect(
      isOpsInboundPayload({
        groupId: 'g1',
        targetDeviceId: 'd1',
        relativePath: '',
        fileName: 'a',
        dataBase64: ''
      })
    ).toBe(false)
  })
})
