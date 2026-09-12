import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'vitest'
import { projectRoot } from '../../projectRoot.ts'

function read(rel: string): string {
  return readFileSync(join(projectRoot, rel), 'utf8')
}

describe('onekey console encoding', () => {
  it('feeds PowerShell via quoted heredoc so bash never expands $_', () => {
    const sh = read('onekey_run.sh')
    assert.match(sh, /onekey-win-vite-procs\.ps1/)
    assert.doesNotMatch(
      sh,
      /powershell\.exe[^\n]*-Command /,
      'do not pass $_ via bash -Command (expands to expand_aliases / hangs on -)'
    )
    assert.match(sh, /strip_bom/)
    assert.match(sh, /read_mode/)
    const winPs = read('scripts/onekey-win-vite-procs.ps1')
    assert.match(winPs, /UTF8Encoding \$false/)
    assert.match(winPs, /electron-vite/)
  })

  it('forces Windows console UTF-8 and writes pid/mode without BOM', () => {
    const ps1 = read('onekey_run.ps1')
    assert.match(ps1, /chcp 65001/)
    assert.match(ps1, /function Use-Utf8Console/)
    assert.match(ps1, /function Write-LanpmText/)
    assert.match(ps1, /function Read-LanpmText/)
    assert.match(ps1, /UTF8Encoding \$false/)
    assert.doesNotMatch(
      ps1,
      /Set-Content -Path \$ModeFile -Value \$Mode -Encoding utf8/,
      'PS 5.1 utf8 encoding writes BOM'
    )
    assert.doesNotMatch(ps1, /Set-Content -Path \$PidFile -Value \$devPid -Encoding utf8/)
  })
})
