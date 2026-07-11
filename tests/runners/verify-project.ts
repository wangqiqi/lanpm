/**
 * 项目健康检查：lint、版本一致性、文档索引、P0 守卫、test、shared、search、build。
 * Run: npm run verify:project
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'

const root = projectRoot

function run(cmd: string): void {
  const r = spawnSync(cmd, { shell: true, cwd: root, stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`failed: ${cmd}`)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  version: string
  scripts: Record<string, string>
}
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
const readme = readFileSync(join(root, 'README.md'), 'utf8')
const doc06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')

const versionHeadings = [...changelog.matchAll(/^## \[([^\]]+)\]/gm)].map((m) => m[1])
assert.ok(versionHeadings.length > 0, 'CHANGELOG missing version heading')
const changelogVersion = versionHeadings.find((v) => v !== 'Unreleased')
assert.ok(changelogVersion, 'CHANGELOG missing released version heading')
assert.equal(
  pkg.version,
  changelogVersion,
  `package.json version ${pkg.version} != CHANGELOG ${changelogVersion}`
)

assert.ok(
  readme.includes(pkg.version),
  `README missing current version ${pkg.version}`
)
assert.ok(
  doc06.includes('package.json') || doc06.includes(pkg.version),
  'docs/06_ROADMAP should reference package.json or current version'
)

const requiredScripts = [
  'lint',
  'typecheck',
  'test',
  'build',
  'verify:m7',
  'verify:visual',
  'verify:search',
  'verify:shared',
  'verify:p0',
  'verify:dual-stub'
] as const
for (const s of requiredScripts) {
  assert.ok(pkg.scripts[s], `package.json missing script: ${s}`)
}

const docNav = readFileSync(join(root, 'docs/00_文档导航.md'), 'utf8')
for (const doc of [
  '03_数据模型与协议草案.md',
  '04_交互与UI约定.md',
  '05_测试与联调发布.md',
  '06_ROADMAP.md'
]) {
  assert.ok(docNav.includes(doc), `docs/00 missing index for ${doc}`)
  assert.ok(existsSync(join(root, 'docs', doc)), `missing docs/${doc}`)
}

console.log('verify:project — static checks OK', `(v${pkg.version})`)

console.log('\n=== verify:project / verify:p0 ===')
run('npm run verify:p0')

console.log('\n=== verify:project / verify:docs-code (strict) ===')
run('npm run verify:docs-code -- --strict')

console.log('\n=== verify:project / lint ===')
run('npm run lint')

console.log('\n=== verify:project / verify:coverage ===')
run('npm run verify:coverage')

console.log('\n=== verify:project / verify:shared ===')
run('npm run verify:shared')

console.log('\n=== verify:project / verify:search ===')
run('npm run verify:search')

console.log('\n=== verify:project / build ===')
run('npm run build')

console.log('\n=== verify:project / verify:electron-smoke ===')
run('npm run verify:electron-smoke')

console.log('\nverify:project: all passed')
