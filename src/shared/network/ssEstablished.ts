/** Parse `ss -tn` / `netstat -tn` for an ESTAB session to host:port. */
export function hasEstablishedTcpTo(tableOutput: string, host: string, port: number): boolean {
  const needle = `${host}:${port}`
  return tableOutput.split(/\r?\n/).some((line) => {
    const t = line.trim()
    if (!t) return false
    const state = t.split(/\s+/)[0] ?? ''
    if (state !== 'ESTAB' && state !== 'ESTABLISHED') return false
    return t.includes(needle)
  })
}
