import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, beforeEach, afterEach } from 'vitest'
import { executeOpsCommand } from '../../../src/main/ops/commandExecutor.ts'
import type { GatewayPaths } from '../../../src/shared/ops/paths.ts'

describe('executeOpsCommand', () => {
  let root: string
  let paths: GatewayPaths

  beforeEach(() => {
    root = join(tmpdir(), `lanpm-ops-exec-${Date.now()}`)
    mkdirSync(join(root, 'inbound'), { recursive: true })
    mkdirSync(join(root, 'outbound', 'logs'), { recursive: true })
    writeFileSync(join(root, 'outbound', 'logs', 'app.log'), 'line1\n', 'utf8')
    paths = {
      root,
      inboundDir: 'inbound',
      outboundPaths: { app: 'outbound/logs/app.log' },
      maxBytes: 1024 * 1024
    }
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('runs help', async () => {
    const r = await executeOpsCommand(paths, { command: 'help' })
    assert.equal(r.ok, true)
    assert.match(r.text ?? '', /\/logs/)
  })

  it('runs status with disk path from agent root', async () => {
    const r = await executeOpsCommand(paths, { command: 'status' })
    assert.equal(r.ok, true)
    assert.match(r.text ?? '', /mem: \d+%/)
    assert.match(r.text ?? '', /disk\(/)
  })

  it('runs deploy', async () => {
    const r = await executeOpsCommand(paths, { command: 'deploy', args: ['pkg.tar.gz'] })
    assert.equal(r.ok, true)
  })
})
