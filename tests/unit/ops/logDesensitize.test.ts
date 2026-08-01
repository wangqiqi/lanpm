import { describe, expect, it } from 'vitest'
import {
  desensitizeOpsLogText,
  formatOpsLogSeedMarkdown,
  truncateOpsLogText
} from '../../../src/shared/ops/logDesensitize.ts'

describe('logDesensitize', () => {
  it('masks ipv4 and unix paths', () => {
    const raw = 'error at /var/log/app.log from 192.168.1.10 user@corp.com'
    const out = desensitizeOpsLogText(raw)
    expect(out).not.toContain('192.168.1.10')
    expect(out).not.toContain('/var/log/app.log')
    expect(out).not.toContain('user@corp.com')
    expect(out).toContain('[IP]')
    expect(out).toContain('[PATH]')
    expect(out).toContain('[EMAIL]')
  })

  it('truncates long text with marker', () => {
    const out = truncateOpsLogText('x'.repeat(100), 40)
    expect(out.length).toBeLessThan(100)
    expect(out).toContain('truncated')
  })

  it('formats seed markdown with fence', () => {
    const seed = formatOpsLogSeedMarkdown('app.log', 'line1')
    expect(seed).toContain('## Ops log: app.log')
    expect(seed).toContain('```')
    expect(seed).toContain('line1')
  })
})
