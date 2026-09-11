/**
 * Browser `dev:web` smoke（Playwright + Vite renderer stub）。
 * Run: npm run verify:e2e-dev-web
 */
import { spawnSync } from 'node:child_process'
import { projectRoot } from '../projectRoot.ts'

const r = spawnSync(
  'npx',
  ['playwright', 'test', '--config=playwright.dev-web.config.ts'],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
  }
)

if (r.status !== 0) {
  process.exit(r.status ?? 1)
}

console.log('verify:e2e-dev-web: all passed')
