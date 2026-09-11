/**
 * Renderer 日历交互 E2E（Playwright + Electron）。
 * Run: npm run verify:e2e-calendar
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { electronMainJs, projectRoot } from '../projectRoot.ts'

const mainJs = electronMainJs

if (!existsSync(mainJs)) {
  console.log('verify:e2e-calendar: building electron app…')
  const build = spawnSync('npm', ['run', 'build'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
  })
  if (build.status !== 0) {
    process.exit(build.status ?? 1)
  }
}

const r = spawnSync('npx', ['playwright', 'test', 'tests/e2e/calendar.spec.ts'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
})

if (r.status !== 0) {
  process.exit(r.status ?? 1)
}

console.log('verify:e2e-calendar: all passed')
