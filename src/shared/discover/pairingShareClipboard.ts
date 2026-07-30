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
