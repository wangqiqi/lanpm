/** Parse manual peer address `host:port` (docs/02 §13.2) */
export function parseHostPort(input: string): { host: string; port: number } {
  const trimmed = input.trim()
  const match = trimmed.match(/^([^:\s]+):(\d{1,5})$/)
  if (!match) {
    throw new Error('INVALID_HOST_PORT')
  }
  const port = Number(match[2])
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('INVALID_PORT')
  }
  return { host: match[1], port }
}
