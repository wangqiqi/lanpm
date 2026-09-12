/** Parse `ss -tn` / `netstat -tn` / `netstat -ano` for an ESTAB session involving peer host:port. */
export function hasEstablishedTcpTo(tableOutput: string, host: string, port: number): boolean {
  const peerNeedle = `${host}:${port}`
  const portSuffix = `:${port}`
  return tableOutput.split(/\r?\n/).some((line) => {
    const t = line.trim()
    if (!t) return false
    if (!/\bESTAB(?:LISHED)?\b/i.test(t)) return false
    if (t.includes(peerNeedle)) return true
    // Windows netstat -ano: `TCP  local:43124  peer:ephemeral  ESTABLISHED` (peer port ≠ 43124)
    if (!t.includes(host)) return false
    return t.includes(portSuffix)
  })
}
