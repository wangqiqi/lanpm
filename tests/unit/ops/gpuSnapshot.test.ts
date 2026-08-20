import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'vitest'
import { formatGpuLine } from '../../../src/main/ops/gpuSnapshot.ts'
import {
  LANPM_ENABLE_GPU_ENV,
  shouldDisableLinuxGpu,
  linuxGpuNote
} from '../../../src/shared/ops/linuxGpuPolicy.ts'

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

describe('linuxGpuPolicy', () => {
  const prev = process.env[LANPM_ENABLE_GPU_ENV]

  afterEach(() => {
    if (prev === undefined) delete process.env[LANPM_ENABLE_GPU_ENV]
    else process.env[LANPM_ENABLE_GPU_ENV] = prev
  })

  it('disables GPU on Linux by default', () => {
    delete process.env[LANPM_ENABLE_GPU_ENV]
    assert.equal(shouldDisableLinuxGpu('linux', {}), true)
    assert.equal(shouldDisableLinuxGpu('win32', {}), false)
    assert.match(linuxGpuNote('linux', {}), /linux-disableHardwareAcceleration/)
  })

  it('skips disable when LANPM_ENABLE_GPU=1 on Linux', () => {
    assert.equal(shouldDisableLinuxGpu('linux', { [LANPM_ENABLE_GPU_ENV]: '1' }), false)
    assert.equal(shouldDisableLinuxGpu('linux', { [LANPM_ENABLE_GPU_ENV]: 'true' }), true)
    assert.match(linuxGpuNote('linux', { [LANPM_ENABLE_GPU_ENV]: '1' }), /LANPM_ENABLE_GPU=1/)
  })
})
