import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { formatGpuLine } from '../../../src/main/ops/gpuSnapshot.ts'

describe('gpuSnapshot', () => {
  it('formatGpuLine renders utilization and memory', () => {
    const line = formatGpuLine({
      name: 'NVIDIA A100',
      utilizationPct: 42,
      memoryUsedMb: 1024,
      memoryTotalMb: 40960
    })
    assert.match(line, /gpu: 42%/)
    assert.match(line, /NVIDIA A100/)
    assert.match(line, /1024\/40960/)
  })
})
