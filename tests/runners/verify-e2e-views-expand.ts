/**
 * Extended Renderer E2E — gantt/calendar deep links + collaboration drawer.
 * Run: npm run verify:e2e-views-expand
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { electronMainJs, projectRoot } from '../projectRoot.ts'

const mainJs = electronMainJs
const specs = [
  'tests/e2e/views-extended-tab-smoke.spec.ts',
  'tests/e2e/collab-drawer-smoke.spec.ts',
  'tests/e2e/nav-preferences-files-tab.spec.ts'
]

console.log('verify:e2e-views-expand: building electron app…')
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
  console.error('verify:e2e-views-expand: build did not produce .lanpm/artifact/out/main/index.js')
  process.exit(1)
}

for (const spec of specs) {
  console.log(`verify:e2e-views-expand: running ${spec}…`)
  const r = spawnSync('npx', ['playwright', 'test', spec], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
  })
  if (r.status !== 0) {
    process.exit(r.status ?? 1)
  }
}

console.log('verify:e2e-views-expand: all passed')
