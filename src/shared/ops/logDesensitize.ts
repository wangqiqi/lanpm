/** Max chars injected into L3 assistant seed (after desensitize). */
export const OPS_LOG_SEED_MAX_CHARS = 12_000

const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const UNIX_PATH_RE = /\/(?:[\w@$%#+~.-]+(?:\/[\w@$%#+~.-]+)*)/g
const WIN_PATH_RE = /[A-Za-z]:\\(?:[\w@$%#+~.-]+\\)*[\w@$%#+~.-]*/g
const EMAIL_RE = /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g

export function desensitizeOpsLogText(text: string): string {
  return text
    .replace(IPV4_RE, '[IP]')
    .replace(EMAIL_RE, '[EMAIL]')
    .replace(UNIX_PATH_RE, '[PATH]')
    .replace(WIN_PATH_RE, '[PATH]')
}

export function truncateOpsLogText(text: string, maxChars = OPS_LOG_SEED_MAX_CHARS): string {
  if (text.length <= maxChars) return text
  const head = text.slice(0, maxChars)
  const omitted = text.length - maxChars
  return `${head}\n\n… [truncated ${omitted} chars] …`
}

export function formatOpsLogSeedMarkdown(label: string, rawText: string): string {
  const safeLabel = label.trim() || 'ops-log'
  const body = truncateOpsLogText(desensitizeOpsLogText(rawText))
  return [
    `## Ops log: ${safeLabel}`,
    '',
    '_Desensitized excerpt (paths/IPs masked)._',
    '',
    '```',
    body,
    '```'
  ].join('\n')
}
