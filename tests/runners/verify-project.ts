/**
 * 项目健康检查：lint、版本一致性、文档索引、关键 verify 脚本存在性。
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
const versionMatch = changelog.match(/^## \[([^\]]+)\]/m)
assert.ok(versionMatch, 'CHANGELOG missing latest version heading')
const changelogVersion = versionMatch[1]
assert.equal(
  pkg.version,
  changelogVersion,
  `package.json version ${pkg.version} != CHANGELOG ${changelogVersion}`
)

const requiredScripts = [
  'lint',
  'typecheck',
  'test',
  'build',
  'verify:m7',
  'verify:visual',
  'verify:search',
  'verify:shared'
] as const
for (const s of requiredScripts) {
  assert.ok(pkg.scripts[s], `package.json missing script: ${s}`)
}

const docNav = readFileSync(join(root, 'docs/00_文档导航.md'), 'utf8')
for (const doc of [
  '03_数据模型与协议草案.md',
  '04_交互与UI约定.md',
  '05_测试与联调发布.md',
  '06_验收与里程碑计划.md'
]) {
  assert.ok(docNav.includes(doc), `docs/00 missing index for ${doc}`)
  assert.ok(existsSync(join(root, 'docs', doc)), `missing docs/${doc}`)
}

console.log('verify:project — static checks OK', `(v${pkg.version})`)

console.log('\n=== verify:project / lint ===')
run('npm run lint')

console.log('\n=== verify:project / test ===')
run('npm run test')

console.log('\n=== verify:project / verify:shared ===')
run('npm run verify:shared')

console.log('\n=== verify:project / verify:search ===')
run('npm run verify:search')

console.log('\nverify:project: all passed')
