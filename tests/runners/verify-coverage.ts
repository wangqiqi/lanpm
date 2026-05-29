/**
 * AUTO-16 — shared 域 Vitest 覆盖率阈值门禁（配置见 vitest.config.ts）。
 * Run: npm run verify:coverage
 */
import { spawnSync } from 'node:child_process'
import { projectRoot } from '../projectRoot.ts'

console.log('verify:coverage — running vitest with coverage thresholds')

const result = spawnSync('npm', ['run', 'test:coverage'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: false
})

if (result.status !== 0) {
  throw new Error('verify:coverage failed (below threshold or test failure)')
}

console.log('verify:coverage OK')
