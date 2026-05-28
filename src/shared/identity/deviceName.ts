const MAX_LEN = 30
const FALLBACK = '本机'

/** 规范化设备显示名（主机名等），1–30 字符 */
export function resolveDeviceName(raw?: string | null, fallback = FALLBACK): string {
  let name = (raw ?? '').trim()
  if (!name) name = fallback
  if (name.length > MAX_LEN) name = name.slice(0, MAX_LEN)
  return name
}
