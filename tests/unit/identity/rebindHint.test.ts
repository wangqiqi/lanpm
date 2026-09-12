import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearRebindHint,
  readRebindHint,
  writeRebindHint
} from '../../../src/main/identity/rebindHint'

describe('identity rebind hint', () => {
  let root: string

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true })
  })

  it('round-trips userId and deviceId at userData root', () => {
    root = mkdtempSync(join(tmpdir(), 'lanpm-rebind-'))
    writeRebindHint(root, { userId: 'alice-2409', deviceId: 'dev-abc' })
    expect(readRebindHint(root)).toEqual({ userId: 'alice-2409', deviceId: 'dev-abc' })
    clearRebindHint(root)
    expect(readRebindHint(root)).toBeNull()
  })
})
