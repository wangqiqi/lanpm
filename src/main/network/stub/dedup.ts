/** M0-10 — dedupe by senderDeviceId + msgId (docs/02) */
export class MessageDedup {
  private readonly seen = new Set<string>()
  private readonly order: string[] = []
  private readonly maxSize: number

  constructor(maxSize = 10_000) {
    this.maxSize = maxSize
  }

  private key(senderDeviceId: string, msgId: string): string {
    return `${senderDeviceId}:${msgId}`
  }

  has(senderDeviceId: string, msgId: string): boolean {
    return this.seen.has(this.key(senderDeviceId, msgId))
  }

  /** @returns true if first time seen */
  remember(senderDeviceId: string, msgId: string): boolean {
    const k = this.key(senderDeviceId, msgId)
    if (this.seen.has(k)) return false
    this.seen.add(k)
    this.order.push(k)
    while (this.order.length > this.maxSize) {
      const oldest = this.order.shift()
      if (oldest) this.seen.delete(oldest)
    }
    return true
  }

  clear(): void {
    this.seen.clear()
    this.order.length = 0
  }
}
