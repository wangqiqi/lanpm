/** 聊天 transport.publish 有限次自动重试（不含手动重试） */
export const CHAT_PUBLISH_MAX_ATTEMPTS = 3

/** attemptIndex 从 0 起：第 1 次立即，之后指数退避，封顶 1s */
export function chatPublishBackoffMs(attemptIndex: number): number {
  if (attemptIndex <= 0) return 0
  return Math.min(1000, 100 * 2 ** (attemptIndex - 1))
}

export async function runWithPublishRetries(
  publish: () => Promise<void>,
  options?: {
    maxAttempts?: number
    sleep?: (ms: number) => Promise<void>
  }
): Promise<void> {
  const maxAttempts = options?.maxAttempts ?? CHAT_PUBLISH_MAX_ATTEMPTS
  const sleep =
    options?.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))

  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const wait = chatPublishBackoffMs(attempt)
    if (wait > 0) await sleep(wait)
    try {
      await publish()
      return
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
