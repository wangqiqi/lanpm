/**
 * Allow only http(s) absolute URLs for bookmark / webview navigation.
 * Rejects file:, javascript:, data:, and relative paths.
 */
export function isAllowedHttpUrl(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return false
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}
