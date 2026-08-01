import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type GpuSnapshot = {
  name: string
  utilizationPct: number
  memoryUsedMb: number
  memoryTotalMb: number
}

export function formatGpuLine(gpu: GpuSnapshot): string {
  return `gpu: ${gpu.utilizationPct}% (${gpu.name}, mem ${gpu.memoryUsedMb}/${gpu.memoryTotalMb} MiB)`
}

function parseGpuCsvLine(line: string): GpuSnapshot | null {
  const parts = line.split(',').map((p) => p.trim())
  if (parts.length < 4) return null
  const utilizationPct = Number(parts[1])
  const memoryUsedMb = Number(parts[2])
  const memoryTotalMb = Number(parts[3])
  if (
    !parts[0] ||
    !Number.isFinite(utilizationPct) ||
    !Number.isFinite(memoryUsedMb) ||
    !Number.isFinite(memoryTotalMb)
  ) {
    return null
  }
  return {
    name: parts[0],
    utilizationPct: Math.round(utilizationPct),
    memoryUsedMb: Math.round(memoryUsedMb),
    memoryTotalMb: Math.round(memoryTotalMb)
  }
}

/** Probe first NVIDIA GPU via `nvidia-smi`. Returns null when tool/GPU absent (line omitted). */
export async function readGpuSnapshot(): Promise<GpuSnapshot | null> {
  try {
    const { stdout } = await execFileAsync(
      'nvidia-smi',
      [
        '--query-gpu=name,utilization.gpu,memory.used,memory.total',
        '--format=csv,noheader,nounits'
      ],
      { timeout: 4000, maxBuffer: 64 * 1024 }
    )
    const line = stdout
      .trim()
      .split('\n')
      .map((row) => row.trim())
      .find(Boolean)
    if (!line) return null
    return parseGpuCsvLine(line)
  } catch {
    return null
  }
}
