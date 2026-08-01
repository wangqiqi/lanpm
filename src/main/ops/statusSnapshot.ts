import os from 'node:os'
import { statfsSync } from 'node:fs'
import { formatGpuLine, readGpuSnapshot, type GpuSnapshot } from './gpuSnapshot.ts'

export type { GpuSnapshot } from './gpuSnapshot.ts'

export type DiskUsage = {
  usedBytes: number
  totalBytes: number
  usedPct: number
}

export type StatusSnapshotInputs = {
  hostname?: string
  platform?: string
  arch?: string
  cpuCount?: number
  loadavg?: number[]
  totalMem?: number
  freeMem?: number
  uptimeSeconds?: number
  diskPath?: string
  readDisk?: (path: string) => DiskUsage | null
  gpu?: GpuSnapshot | 'unavailable' | null
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0B'
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return `${gb.toFixed(1)}G`
  const mb = bytes / 1024 ** 2
  if (mb >= 1) return `${mb.toFixed(1)}M`
  const kb = bytes / 1024
  if (kb >= 1) return `${kb.toFixed(1)}K`
  return `${Math.round(bytes)}B`
}

export function formatUptime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const days = Math.floor(safe / 86_400)
  const hours = Math.floor((safe % 86_400) / 3_600)
  const minutes = Math.floor((safe % 3_600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function readDiskUsageSync(path: string): DiskUsage | null {
  try {
    const st = statfsSync(path)
    const totalBytes = st.blocks * st.bsize
    const freeBytes = st.bfree * st.bsize
    if (totalBytes <= 0) return null
    const usedBytes = Math.max(0, totalBytes - freeBytes)
    const usedPct = Math.round((usedBytes / totalBytes) * 100)
    return { usedBytes, totalBytes, usedPct }
  } catch {
    return null
  }
}

export function buildStatusLines(inputs: StatusSnapshotInputs = {}): string[] {
  const hostname = inputs.hostname ?? os.hostname()
  const platform = inputs.platform ?? os.platform()
  const arch = inputs.arch ?? os.arch()
  const cpuCount = inputs.cpuCount ?? os.cpus().length
  const load = (inputs.loadavg ?? os.loadavg()).map((n) => n.toFixed(2)).join(', ')
  const totalMem = inputs.totalMem ?? os.totalmem()
  const freeMem = inputs.freeMem ?? os.freemem()
  const usedMem = Math.max(0, totalMem - freeMem)
  const memPct = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0
  const uptimeSeconds = inputs.uptimeSeconds ?? os.uptime()
  const diskPath = inputs.diskPath ?? '/'
  const readDisk = inputs.readDisk ?? readDiskUsageSync
  const disk = readDisk(diskPath)

  const lines = [
    `host: ${hostname}`,
    `platform: ${platform} ${arch}`,
    `uptime: ${formatUptime(uptimeSeconds)}`,
    `cpu: ${cpuCount} cores, load ${load}`,
    `mem: ${memPct}% (${formatBytes(usedMem)} / ${formatBytes(totalMem)})`
  ]

  if (disk) {
    lines.push(
      `disk(${diskPath}): ${disk.usedPct}% (${formatBytes(disk.usedBytes)} / ${formatBytes(disk.totalBytes)})`
    )
  } else {
    lines.push('disk: unavailable')
  }

  if (inputs.gpu === 'unavailable') {
    lines.push('gpu: unavailable')
  } else if (inputs.gpu) {
    lines.push(formatGpuLine(inputs.gpu))
  }

  return lines
}

export async function formatStatus(diskPath = '/'): Promise<string> {
  const gpu = await readGpuSnapshot()
  return buildStatusLines({ diskPath, gpu: gpu ?? undefined }).join('\n')
}

/** Sync formatter for tests and callers that inject GPU. */
export function formatStatusSync(diskPath = '/', inputs: Omit<StatusSnapshotInputs, 'diskPath'> = {}): string {
  return buildStatusLines({ ...inputs, diskPath }).join('\n')
}
