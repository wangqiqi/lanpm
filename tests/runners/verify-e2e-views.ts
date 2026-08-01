/**
 * Renderer 底栏 Tab 挂载冒烟 E2E（Playwright + Electron）。
 * Run: npm run verify:e2e-views
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const mainJs = join(projectRoot, 'out/main/index.js')

console.log('verify:e2e-views: building electron app…')
const build = spawnSync('npm', ['run', 'build'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
})
if (build.status !== 0) {
  process.exit(build.status ?? 1)
}
if (!existsSync(mainJs)) {
  console.error('verify:e2e-views: build did not produce out/main/index.js')
  process.exit(1)
}

const r = spawnSync('npx', ['playwright', 'test', 'tests/e2e/views-tab-smoke.spec.ts'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
})

if (r.status !== 0) {
  process.exit(r.status ?? 1)
}

console.log('verify:e2e-views: all passed')
