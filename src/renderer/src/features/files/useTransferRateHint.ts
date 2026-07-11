import { useEffect, useRef, useState } from 'react'
import type { FileTransferView } from '@shared/file/types'
import {
  estimateBytesPerSecond,
  estimateEtaSeconds,
  formatEtaSeconds,
  formatRate
} from '@shared/file/transferControl'

type Sample = { t: number; bytes: number }

/** 活动传输行：基于 transferredBytes 采样显示速率 / ETA */
export function useTransferRateHint(tr: FileTransferView): string | null {
  const samplesRef = useRef<Sample[]>([])
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    const now = Date.now()
    const samples = samplesRef.current
    samples.push({ t: now, bytes: tr.transferredBytes })
    if (samples.length > 8) samples.splice(0, samples.length - 8)

    const rate = estimateBytesPerSecond(samples)
    const remaining = Math.max(0, tr.totalBytes - tr.transferredBytes)
    const eta = estimateEtaSeconds(remaining, rate ?? 0)
    const rateText = formatRate(rate)
    const etaText = formatEtaSeconds(eta)
    if (rateText && etaText) setHint(`${rateText} · ~${etaText}`)
    else if (rateText) setHint(rateText)
    else if (etaText) setHint(`~${etaText}`)
    else setHint(null)
  }, [tr.transferId, tr.transferredBytes, tr.totalBytes])

  useEffect(() => {
    samplesRef.current = []
    setHint(null)
  }, [tr.transferId])

  return hint
}
