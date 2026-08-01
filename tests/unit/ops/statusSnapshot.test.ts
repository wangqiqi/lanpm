import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import {
  buildStatusLines,
  formatBytes,
  formatUptime,
  type DiskUsage
} from '../../../src/main/ops/statusSnapshot.ts'

describe('statusSnapshot', () => {
  it('formatBytes uses G/M/K tiers', () => {
    assert.equal(formatBytes(512), '512B')
    assert.equal(formatBytes(2048), '2.0K')
    assert.equal(formatBytes(5 * 1024 ** 2), '5.0M')
    assert.equal(formatBytes(2.5 * 1024 ** 3), '2.5G')
  })

  it('formatUptime renders days hours minutes', () => {
    assert.equal(formatUptime(45), '0m')
    assert.equal(formatUptime(3_600), '1h 0m')
    assert.equal(formatUptime(90_000), '1d 1h')
  })

  it('buildStatusLines includes mem absolute and disk line', () => {
    const disk: DiskUsage = {
      usedBytes: 80 * 1024 ** 3,
      totalBytes: 100 * 1024 ** 3,
      usedPct: 80
    }
    const lines = buildStatusLines({
      hostname: 'prod-web-01',
      platform: 'linux',
      arch: 'x64',
      cpuCount: 8,
      loadavg: [0.12, 0.08, 0.05],
      totalMem: 16 * 1024 ** 3,
      freeMem: 4 * 1024 ** 3,
      uptimeSeconds: 7_200,
      diskPath: '/data',
      readDisk: () => disk
    })
    const text = lines.join('\n')
    assert.match(text, /host: prod-web-01/)
    assert.match(text, /uptime: 2h 0m/)
    assert.match(text, /cpu: 8 cores, load 0\.12, 0\.08, 0\.05/)
    assert.match(text, /mem: 75% \(12\.0G \/ 16\.0G\)/)
    assert.match(text, /disk\(\/data\): 80% \(80\.0G \/ 100\.0G\)/)
  })

  it('buildStatusLines degrades when disk unavailable', () => {
    const lines = buildStatusLines({
      hostname: 'edge',
      readDisk: () => null
    })
    assert.ok(lines.some((line) => line === 'disk: unavailable'))
  })
})
