/**
 * 跨网段「三节点」命名空间集成测试（TEST-02）：
 * 在同机用非特权 user+net namespace 搭 2 个端点 + 1 个路由器，验证 docs/08 §3.1/§3.2/§3.3：
 *   1. 同一 /24 直连段：UDP 广播发现互相可见（对照组）
 *   2. 不同 /24、路由可达：ping 通 · UDP 广播不跨段 · 连接码 + 完整 IP 走 TCP 配对成功
 *   3. 不同 /24、不可达：ping 不通 · 连接码同样失败（产品不适用，先改拓扑）
 *
 * Run: npm run verify:cross-subnet-namespaces
 * 环境不支持（非 Linux / 缺 unshare·ip·nsenter / 内核禁用非特权 userns）时 **显式 SKIP 并退出 0**，
 * 不会伪装成通过；届时请按 docs/08 §2 手验。
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const topologyScript = join(projectRoot, 'tests/integration/helpers/ns-cross-subnet-topology.sh')
const base = join(projectRoot, '.lanpm', 'tmp', `cross-subnet-${process.pid}`)

const WAIT_MS = '15000'
const UDP_MS = '9000'
const ISO_WAIT_MS = '6000'

function skip(reason: string): never {
  console.log(`verify:cross-subnet-namespaces: SKIPPED (${reason})`)
  process.exit(0)
}

function hasBinary(bin: string): boolean {
  return spawnSync('sh', ['-c', `command -v ${bin}`], { stdio: 'ignore' }).status === 0
}

if (process.platform !== 'linux') skip(`platform=${process.platform} (需要 Linux network namespace)`)
for (const bin of ['unshare', 'ip', 'nsenter']) {
  if (!hasBinary(bin)) skip(`${bin} not found`)
}
if (!existsSync(topologyScript)) skip(`missing ${topologyScript}`)
if (spawnSync('unshare', ['-rn', 'true'], { stdio: 'ignore' }).status !== 0) {
  skip('非特权 user+net namespace 不可用（unshare -rn 失败；Ubuntu 24.04 可开 kernel.apparmor_restrict_unprivileged_userns=0）')
}

mkdirSync(base, { recursive: true })
console.log(`verify:cross-subnet-namespaces: topology in ${base}`)

const run = spawnSync(
  'unshare',
  ['-rn', 'bash', topologyScript, base, projectRoot, process.execPath, WAIT_MS, UDP_MS, ISO_WAIT_MS],
  { stdio: 'inherit', timeout: 600_000 }
)

function readText(name: string): string {
  const path = join(base, name)
  return existsSync(path) ? readFileSync(path, 'utf8').trim() : ''
}

function readJson(name: string): Record<string, unknown> {
  const raw = readText(name)
  assert.ok(raw.length > 0, `missing probe result ${name} (topology exit=${String(run.status)})`)
  return JSON.parse(raw) as Record<string, unknown>
}

function fail(message: string): never {
  console.error(`\n✗ ${message}`)
  const log = readText('script.log')
  if (log) console.error(`--- topology log (tail) ---\n${log.split('\n').slice(-40).join('\n')}`)
  rmSync(base, { recursive: true, force: true })
  process.exit(1)
}

try {
  // --- 阶段 1：同网段 UDP 发现（对照组） ---
  const p1a = readJson('phase1-a.json')
  const p1b = readJson('phase1-b.json')
  assert.ok(
    Number(p1a.peers) >= 1,
    `阶段 1：A 在同一 /24 直连段上应通过 UDP 广播发现 B，实际 peers=${String(p1a.peers)}`
  )
  assert.ok(
    Number(p1b.peers) >= 1,
    `阶段 1：B 应发现 A，实际 peers=${String(p1b.peers)}`
  )

  // --- 阶段 2：不同 /24 但路由可达 ---
  const ping2 = readText('phase2-ping.txt')
  assert.equal(ping2, 'OK', '阶段 2 前提：跨网段应 ping 通（拓扑未生效？）')

  const p2a = readJson('phase2-a.json')
  const p2b = readJson('phase2-b.json')
  assert.equal(
    Number(p2a.peers),
    0,
    `阶段 2：UDP 广播不应跨 /24（A 看到 ${JSON.stringify(p2a.devices ?? [])}）`
  )
  assert.equal(
    Number(p2b.peers),
    0,
    `阶段 2：UDP 广播不应跨 /24（B 看到 ${JSON.stringify(p2b.devices ?? [])}）`
  )

  const join2 = readJson('phase2-join.json')
  const host2 = readJson('phase2-host.json')
  assert.equal(
    readText('phase2-join.json.rc'),
    '0',
    `阶段 2：连接码 + 完整 IP 应配对成功，实际 ${JSON.stringify(join2)}`
  )
  assert.equal(join2.ok, true, `阶段 2：join 未成功：${JSON.stringify(join2)}`)
  assert.equal(join2.peerUserId, 'user_ns_p2host', '阶段 2：应连到 A 端点')
  assert.equal(join2.peerHost, '192.168.30.10', '阶段 2：应使用对方完整 IPv4（跨 /24）')
  assert.equal(join2.groups, 1, '阶段 2：应通过配对拿到 A 的可发现群组')
  assert.ok(
    Array.isArray(host2.deviceIds) && (host2.deviceIds as string[]).includes('dev_ns_p2join'),
    `阶段 2：A 侧应登记 B 端点，实际 ${JSON.stringify(host2)}`
  )

  // --- 阶段 3：不同 /24 且不可达 ---
  assert.equal(readText('phase3-ping.txt'), 'FAIL', '阶段 3 前提：应 ping 不通')
  const join3 = readJson('phase3-join.json')
  assert.notEqual(
    readText('phase3-join.json.rc'),
    '0',
    `阶段 3：互 ping 不通时连接码也应失败，实际 ${JSON.stringify(join3)}`
  )
  assert.equal(join3.ok, false, `阶段 3：join 不应成功：${JSON.stringify(join3)}`)
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

console.log('verify:cross-subnet-namespaces: OK')
console.log(
  '  · 阶段 1 同 /24：UDP 广播发现 ✅（A/B 互见）\n' +
    '  · 阶段 2 跨 /24 可达：ping ✅ · 广播不跨段 ✅ · 连接码+完整 IP ✅\n' +
    '  · 阶段 3 跨 /24 隔离：ping ✗ · 连接码 ✗（符合 docs/08 §3.3）'
)
rmSync(base, { recursive: true, force: true })
process.exit(0)
