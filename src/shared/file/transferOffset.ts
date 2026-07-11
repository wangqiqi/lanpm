/**
 * Normalize resume byte offset for chunked transfer.
 * Invalid / negative / past-EOF → 0 (restart from beginning).
 */
export function clampTransferStartOffset(
  startOffset: number | null | undefined,
  totalBytes: number
): number {
  const total = Number.isFinite(totalBytes) && totalBytes > 0 ? Math.floor(totalBytes) : 0
  if (total <= 0) return 0
  const n =
    typeof startOffset === 'number' && Number.isFinite(startOffset) ? Math.floor(startOffset) : 0
  if (n <= 0 || n >= total) return 0
  return n
}
