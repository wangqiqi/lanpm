export interface PairingShareClipboardInput {
  /** 6 位数字码（无空格） */
  code: string
  localIp?: string
  localIpTail?: string
  groupNames: string[]
}

export interface PairingShareClipboardFormatters {
  lineCode: (code: string) => string
  lineIp: (ip: string) => string
  lineIpTail: (tail: string, ip: string) => string
  lineGroups: (names: string) => string
}

/** 多行纯文本，供 IM 粘贴；无 IP/群时省略对应行。 */
export function formatPairingShareClipboard(
  input: PairingShareClipboardInput,
  format: PairingShareClipboardFormatters
): string {
  const lines: string[] = []
  const digits = input.code.replace(/\D/g, '')
  if (digits.length >= 6) {
    lines.push(format.lineCode(digits.slice(0, 6)))
  }
  if (input.localIp) {
    if (input.localIpTail) {
      lines.push(format.lineIpTail(input.localIpTail, input.localIp))
    } else {
      lines.push(format.lineIp(input.localIp))
    }
  }
  const names = input.groupNames.map((n) => n.trim()).filter(Boolean)
  if (names.length > 0) {
    lines.push(format.lineGroups(names.join(', ')))
  }
  return lines.join('\n')
}

const IPV4_RE = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/

/** 从「复制配对信息」或混贴文本里抽出 6 位码与可选 IPv4（同网 Wi‑Fi 隔离时 UDP 不够）。 */
export function parsePairingShareClipboard(text: string): { code?: string; host?: string } {
  const ipMatch = text.match(IPV4_RE)
  const host = ipMatch?.[1]
  const withoutIp = host ? text.replace(host, ' ') : text
  const spaced = withoutIp.match(/\b(\d{3})\s+(\d{3})\b/)
  const compact = withoutIp.replace(/\D/g, '')
  const digits = spaced ? `${spaced[1]}${spaced[2]}` : compact.length >= 6 ? compact.slice(0, 6) : ''
  const code = digits.length === 6 ? digits : undefined
  return {
    ...(code ? { code } : {}),
    ...(host ? { host } : {})
  }
}
